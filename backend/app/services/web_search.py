"""Web search service using Serper API"""
import httpx
from typing import List
import logging
from ..models.response import WebResult

logger = logging.getLogger(__name__)


class WebSearchService:
    """Perform web searches using Serper API"""
    
    def __init__(self, api_key: str):
        """
        Initialize web search service
        
        Args:
            api_key: Serper API key
        """
        self.api_key = api_key
        self.base_url = "https://google.serper.dev/search"
        logger.info("WebSearchService initialized")
    
    async def search(self, query: str, num_results: int = 5) -> List[WebResult]:
        """
        Perform web search using Serper API
        
        Args:
            query: Search query
            num_results: Number of results to return
            
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
            return web_results
            
        except httpx.HTTPError as e:
            logger.error(f"HTTP error during web search: {e}")
            return []
        except Exception as e:
            logger.error(f"Error performing web search: {e}")
            return []
    
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
                f"{result.snippet}\n"
            )
        
        return "\n".join(formatted)
