"""Web search service using Serper API with content fetching"""
import httpx
from typing import List
import logging
from bs4 import BeautifulSoup
import re
from ..models.response import WebResult

logger = logging.getLogger(__name__)


class WebSearchService:
    """Perform web searches using Serper API with optional content fetching"""
    
    def __init__(self, api_key: str):
        """
        Initialize web search service
        
        Args:
            api_key: Serper API key
        """
        self.api_key = api_key
        self.base_url = "https://google.serper.dev/search"
        logger.info("WebSearchService initialized")
    
    async def search(self, query: str, num_results: int = 5, fetch_content: bool = True) -> List[WebResult]:
        """
        Perform web search using Serper API
        
        Args:
            query: Search query
            num_results: Number of results to return
            fetch_content: Whether to fetch full page content (improves answer quality)
            
        Returns:
            List of WebResult objects
        """
        try:
            logger.info(f"Performing web search: {query[:50]}...")
            
            headers = {
                "X-API-KEY": self.api_key,
                "Content-Type": "application/json"
            }
            
            payload = {
                "q": query,
                "num": num_results
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.base_url,
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
            
            # Parse results
            web_results = []
            organic_results = data.get("organic", [])
            
            for idx, result in enumerate(organic_results[:num_results]):
                web_result = WebResult(
                    title=result.get("title", ""),
                    url=result.get("link", ""),
                    snippet=result.get("snippet", ""),
                    position=idx + 1
                )
                web_results.append(web_result)
            
            logger.info(f"Found {len(web_results)} web results")
            
            # Optionally fetch full content from top results
            if fetch_content and web_results:
                web_results = await self._fetch_page_contents(web_results[:3])  # Fetch top 3
            
            return web_results
            
        except httpx.HTTPError as e:
            logger.error(f"HTTP error during web search: {e}")
            return []
        except Exception as e:
            logger.error(f"Error performing web search: {e}")
            return []
    
    async def _fetch_page_contents(self, results: List[WebResult]) -> List[WebResult]:
        """
        Fetch actual page content from URLs to get detailed information
        
        Args:
            results: List of WebResult objects with URLs
            
        Returns:
            Updated WebResult list with extended content
        """
        enhanced_results = []
        
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
            for result in results:
                try:
                    # Fetch page content
                    response = await client.get(
                        result.url,
                        headers={
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                        }
                    )
                    
                    if response.status_code == 200:
                        # Parse HTML and extract text
                        soup = BeautifulSoup(response.text, 'html.parser')
                        
                        # Remove script and style elements
                        for script in soup(["script", "style", "nav", "footer", "header", "aside"]):
                            script.decompose()
                        
                        # Get text content
                        text = soup.get_text(separator=' ', strip=True)
                        
                        # Clean up whitespace
                        text = re.sub(r'\s+', ' ', text)
                        
                        # Limit to ~2000 chars per page (enough for good context)
                        if len(text) > 2000:
                            text = text[:2000] + "..."
                        
                        # Update snippet with actual content
                        result.snippet = text
                        logger.debug(f"Fetched content from {result.url[:50]}... ({len(text)} chars)")
                    
                except Exception as e:
                    logger.warning(f"Failed to fetch content from {result.url}: {e}")
                    # Keep original snippet if fetch fails
                
                enhanced_results.append(result)
        
        logger.info(f"Enhanced {len(enhanced_results)} results with page content")
        return enhanced_results
    
    def format_results_for_context(self, results: List[WebResult]) -> str:
        """
        Format web results for LLM prompt context
        
        Args:
            results: List of WebResult objects
            
        Returns:
            Formatted string for context
        """
        if not results:
            return "No web search results available."
        
        formatted = []
        for result in results:
            formatted.append(
                f"[{result.position}] {result.title}\n"
                f"URL: {result.url}\n"
                f"Content: {result.snippet}\n"
            )
        
        return "\n".join(formatted)

