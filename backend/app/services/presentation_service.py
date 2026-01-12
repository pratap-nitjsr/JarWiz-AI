"""Presentation generation service using LLM with Plate.js JSON output"""
import logging
import json
import uuid
from typing import List, Optional, AsyncGenerator
from datetime import datetime

logger = logging.getLogger(__name__)

# Available themes (from presentation-ai)
AVAILABLE_THEMES = [
    "default",
    "modern",
    "minimal",
    "corporate",
    "creative",
    "dark",
    "nature",
    "tech",
    "elegant"
]

# Presentation settings extraction prompt
SETTINGS_EXTRACTION_PROMPT = """Analyze the following meeting transcript and conversation to extract optimal presentation settings.

Meeting Content:
{context}

Based on the content, determine:
1. A concise, professional presentation title (5-10 words)
2. The optimal theme from: {themes}
3. The recommended number of slides (5-15 based on content depth)
4. Presentation style: "professional" or "casual"
5. Key outline topics (each as a single line)

Respond in this exact JSON format:
{{
    "title": "Your Suggested Title Here",
    "theme": "theme_name",
    "numSlides": 7,
    "style": "professional",
    "outline": [
        "Topic 1: Brief description",
        "Topic 2: Brief description",
        "Topic 3: Brief description"
    ]
}}

Output ONLY the JSON, nothing else."""

# Plate.js slide generation prompt
PLATE_SLIDES_PROMPT = """You are an expert presentation designer. Create a presentation in Plate.js JSON format.

## PRESENTATION INFO
- Title: {title}
- Theme: {theme}
- Style: {style}
- Total Slides: {num_slides}
- Current Date: {current_date}

## MEETING CONTEXT
{context}

## OUTLINE
{outline}

## OUTPUT FORMAT
Generate slides as a JSON array. Each slide must follow this Plate.js structure:

```json
[
  {{
    "id": "unique-slide-id",
    "type": "slide",
    "layout": "left" | "right" | "vertical",
    "imageQuery": "detailed image search query for this slide",
    "children": [
      {{"type": "h1", "children": [{{"text": "Slide Title"}}]}},
      {{"type": "p", "children": [{{"text": "Introductory paragraph"}}]}},
      {{
        "type": "bullets",
        "children": [
          {{"type": "li", "children": [{{"text": "Bullet point 1"}}]}},
          {{"type": "li", "children": [{{"text": "Bullet point 2"}}]}}
        ]
      }}
    ]
  }}
]
```

## AVAILABLE ELEMENT TYPES
- **h1, h2, h3**: Headings (use children with text nodes)
- **p**: Paragraphs
- **bullets**: Bullet list with li children
- **icons**: Icon list (children have "icon" field: rocket, shield, chart, etc.)
- **timeline**: Chronological steps
- **arrows**: Flow/process steps
- **compare**: Two-column comparison
- **table**: Data table with rows/cells
- **img**: Image element with "query" field

## RULES
1. Generate exactly {num_slides} slides as a JSON array
2. First slide should be a title slide with h1
3. Last slide should be a summary/conclusion
4. Vary layouts (left, right, vertical) across slides
5. Use different element types per slide for visual variety
6. Include detailed imageQuery (10+ words) for each slide
7. Expand outline topics with rich content - don't copy verbatim
8. Include 3-5 elements per slide

Output ONLY the valid JSON array of slides, nothing else."""

# Single slide generation for streaming
SINGLE_SLIDE_PROMPT = """Generate ONE slide for a presentation in Plate.js JSON format.

## CONTEXT
- Presentation: {title}
- Theme: {theme}
- Content Style: {content_style}
- Slide {slide_number} of {total_slides}
- Topic: {topic}
- Previous layouts used: {previous_layouts}

## CONTENT STYLE GUIDELINES
- "balanced": Mix of text, bullets, and visuals
- "text-heavy": More detailed paragraphs and comprehensive bullet points
- "visual": Prioritize icons, images, timelines, and visual elements over text

## MEETING CONTEXT
{context}

## OUTPUT
Generate a single slide object:

```json
{{
  "id": "{slide_id}",
  "type": "slide",
  "layout": "{layout}",
  "imageQuery": "detailed 15+ word image description for professional stock photo",
  "children": [
    {{"type": "h2", "children": [{{"text": "Slide Title"}}]}},
    // Additional elements based on content
  ]
}}
```

## AVAILABLE ELEMENTS
- h1, h2, h3: Headings
- p: Paragraphs  
- bullets: With li children - use for key points
- icons: With icon field (rocket, chart, target, shield, lightbulb, users, settings, star)
- timeline: For sequential steps or chronological content
- arrows: For processes/flows/progressions
- compare: For A vs B content, pros/cons
- table: IMPORTANT - Use when data has rows/columns, statistics, comparisons with numbers
  Format: {{"type": "table", "children": [{{"type": "tr", "children": [{{"type": "td", "children": [{{"text": "Cell 1"}}]}}, {{"type": "td", "children": [{{"text": "Cell 2"}}]}}]}}]}}
- img: For visual content - {{"type": "img", "query": "specific search term"}}

## REQUIREMENTS
1. Use layout="{layout}" (vary from previous slides)
2. Choose element types different from: {previous_elements}
3. Include 3-5 content elements
4. Make imageQuery very specific and descriptive (15+ words)
5. ALWAYS include table element when presenting data, statistics, or comparisons
6. For "visual" content style: include at least 1 icon/timeline/arrows element
7. For "text-heavy" content style: include detailed bullets with 4+ points

Output ONLY the JSON object for this one slide, nothing else."""


class PresentationService:
    """Service for generating presentations from meeting context with Plate.js output"""
    
    def __init__(self, llm_service):
        """
        Initialize presentation service
        
        Args:
            llm_service: LLM service for text generation
        """
        self.llm_service = llm_service
        logger.info("PresentationService initialized (Plate.js mode)")
    
    async def extract_presentation_settings(self, context: str) -> dict:
        """
        AI-extract optimal presentation settings from meeting context
        
        Args:
            context: Meeting transcript and chat history
            
        Returns:
            Dictionary with title, theme, numSlides, style, outline
        """
        if not context or len(context.strip()) < 50:
            return {
                "title": "Meeting Summary",
                "theme": "default",
                "numSlides": 5,
                "style": "professional",
                "outline": ["Introduction", "Key Points", "Discussion", "Action Items", "Summary"]
            }
        
        prompt = SETTINGS_EXTRACTION_PROMPT.format(
            context=context[:5000],  # Limit context length
            themes=", ".join(AVAILABLE_THEMES)
        )
        
        try:
            response = await self.llm_service.generate_simple_answer(
                query=prompt,
                context=""
            )
            
            # Parse JSON response
            response_text = response.strip()
            # Handle potential markdown code blocks
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            settings = json.loads(response_text.strip())
            
            # Validate and set defaults
            if settings.get("theme") not in AVAILABLE_THEMES:
                settings["theme"] = "default"
            if not 3 <= settings.get("numSlides", 5) <= 15:
                settings["numSlides"] = min(15, max(3, settings.get("numSlides", 5)))
            if settings.get("style") not in ["professional", "casual"]:
                settings["style"] = "professional"
            if not settings.get("outline"):
                settings["outline"] = ["Introduction", "Main Content", "Summary"]
                
            logger.info(f"Extracted settings: {settings['title']}, theme={settings['theme']}, slides={settings['numSlides']}")
            return settings
            
        except Exception as e:
            logger.error(f"Error extracting settings: {e}")
            return {
                "title": "Meeting Summary",
                "theme": "default",
                "numSlides": 5,
                "style": "professional",
                "outline": ["Introduction", "Key Points", "Discussion", "Action Items", "Summary"]
            }
    
    async def generate_topic_from_context(self, context: str) -> str:
        """
        Generate a presentation topic automatically from meeting context
        (Kept for backwards compatibility)
        """
        settings = await self.extract_presentation_settings(context)
        return settings.get("title", "Meeting Summary")
    
    async def generate_full_presentation(
        self,
        context: str,
        settings: Optional[dict] = None
    ) -> dict:
        """
        Generate a complete presentation with AI-determined settings
        
        Args:
            context: Meeting transcript and chat history
            settings: Optional pre-determined settings (if user modified them)
            
        Returns:
            Complete presentation with settings and slides
        """
        # Extract settings if not provided
        if not settings:
            settings = await self.extract_presentation_settings(context)
        
        current_date = datetime.now().strftime("%A, %B %d, %Y")
        
        prompt = PLATE_SLIDES_PROMPT.format(
            title=settings["title"],
            theme=settings["theme"],
            style=settings["style"],
            num_slides=settings["numSlides"],
            current_date=current_date,
            context=context[:4000] if context else "General presentation",
            outline="\n".join(f"- {item}" for item in settings["outline"])
        )
        
        try:
            response = await self.llm_service.generate_simple_answer(
                query=prompt,
                context=""
            )
            
            # Parse JSON response
            response_text = response.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            slides = json.loads(response_text.strip())
            
            return {
                "settings": settings,
                "slides": slides
            }
            
        except Exception as e:
            logger.error(f"Error generating presentation: {e}")
            raise
    
    async def generate_slides_stream(
        self,
        title: str,
        prompt: str,
        outline: List[str],
        context: Optional[str] = None,
        theme: str = "default",
        style: str = "professional",
        content_style: str = "balanced"
    ) -> AsyncGenerator[str, None]:
        """
        Generate presentation slides as streaming JSON
        
        Args:
            title: Presentation title
            prompt: User's original request  
            outline: List of outline topics
            context: Meeting context
            theme: Presentation theme
            style: Presentation style
            content_style: Content style (balanced, text-heavy, visual)
            
        Yields:
            JSON chunks for parsing
        """
        current_date = datetime.now().strftime("%A, %B %d, %Y")
        num_slides = len(outline) if outline else 5
        
        logger.info(f"Starting Plate.js slide generation: {title}, slides={num_slides}, content_style={content_style}")
        
        layouts = ["left", "right", "vertical"]
        element_types = ["bullets", "icons", "timeline", "arrows", "compare", "table"]
        
        previous_layouts = []
        previous_elements = []
        
        # Start JSON array
        yield '{"slides": ['
        
        for i, topic in enumerate(outline):
            slide_id = str(uuid.uuid4())[:8]
            
            # Vary layout
            layout = layouts[i % len(layouts)]
            while layout in previous_layouts[-2:] and len(previous_layouts) >= 2:
                layout = layouts[(layouts.index(layout) + 1) % len(layouts)]
            
            slide_prompt = SINGLE_SLIDE_PROMPT.format(
                title=title,
                theme=theme,
                content_style=content_style,
                slide_number=i + 1,
                total_slides=num_slides,
                topic=topic,
                context=context[:2000] if context else "",
                slide_id=slide_id,
                layout=layout,
                previous_layouts=", ".join(previous_layouts[-3:]) or "none",
                previous_elements=", ".join(previous_elements[-3:]) or "none"
            )
            
            logger.info(f"Generating slide {i + 1}/{num_slides}")
            
            try:
                # Collect full slide content from LLM
                slide_content = ""
                async for chunk in self.llm_service.generate_long_content_stream(slide_prompt):
                    slide_content += chunk
                
                # Clean the LLM output - remove markdown code blocks
                clean_content = slide_content.strip()
                if "```json" in clean_content:
                    clean_content = clean_content.split("```json")[1].split("```")[0]
                elif "```" in clean_content:
                    parts = clean_content.split("```")
                    if len(parts) >= 2:
                        clean_content = parts[1]
                clean_content = clean_content.strip()
                
                # Parse and validate the slide JSON
                try:
                    slide_obj = json.loads(clean_content)
                    # Ensure it has required fields
                    if "id" not in slide_obj:
                        slide_obj["id"] = slide_id
                    if "type" not in slide_obj:
                        slide_obj["type"] = "slide"
                    if "layout" not in slide_obj:
                        slide_obj["layout"] = layout
                    
                    # Emit clean JSON
                    yield json.dumps(slide_obj)
                    
                except json.JSONDecodeError as je:
                    logger.warning(f"Failed to parse slide {i + 1} JSON: {je}")
                    # Emit fallback slide
                    fallback = {
                        "id": slide_id,
                        "type": "slide",
                        "layout": layout,
                        "imageQuery": f"professional presentation slide about {topic}",
                        "children": [
                            {"type": "h2", "children": [{"text": topic.split("\n")[0]}]},
                            {"type": "p", "children": [{"text": "Content generated from meeting"}]}
                        ]
                    }
                    yield json.dumps(fallback)
                
                # Track used layout
                previous_layouts.append(layout)
                
                # Try to detect element type used
                for etype in element_types:
                    if f'"{etype}"' in slide_content.lower():
                        previous_elements.append(etype)
                        break
                
                # Add comma between slides (except last)
                if i < len(outline) - 1:
                    yield ","
                    
            except Exception as e:
                logger.error(f"Error generating slide {i + 1}: {e}")
                # Emit a fallback slide
                fallback = json.dumps({
                    "id": slide_id,
                    "type": "slide",
                    "layout": layout,
                    "imageQuery": f"professional presentation slide about {topic}",
                    "children": [
                        {"type": "h2", "children": [{"text": topic.split("\n")[0]}]},
                        {"type": "p", "children": [{"text": "Content to be added"}]}
                    ]
                })
                yield fallback
                if i < len(outline) - 1:
                    yield ","
        
        # Close JSON array
        yield ']}'
        
        logger.info(f"Slide generation completed: {num_slides} slides")
    
    async def generate_presentation_stream(
        self,
        context: str,
        settings: Optional[dict] = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream the complete presentation generation process
        
        Args:
            context: Meeting transcript and chat history
            settings: Optional pre-determined settings
            
        Yields:
            JSON chunks with status updates and slide data
        """
        # First, emit settings extraction status
        yield json.dumps({"type": "status", "message": "Analyzing meeting content..."}) + "\n"
        
        # Extract settings
        if not settings:
            settings = await self.extract_presentation_settings(context)
        
        # Emit settings
        yield json.dumps({"type": "settings", "data": settings}) + "\n"
        yield json.dumps({"type": "status", "message": "Generating slides..."}) + "\n"
        
        # Generate slides
        async for chunk in self.generate_slides_stream(
            title=settings["title"],
            prompt=settings["title"],
            outline=settings["outline"],
            context=context,
            theme=settings["theme"],
            style=settings["style"]
        ):
            yield json.dumps({"type": "slide_chunk", "content": chunk}) + "\n"
        
        yield json.dumps({"type": "done"}) + "\n"
    
    # Legacy methods for backwards compatibility
    async def generate_outline_stream(
        self,
        topic: str,
        num_slides: int = 5,
        context: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Generate outline (legacy method - kept for compatibility)
        Now internally uses settings extraction
        """
        settings = await self.extract_presentation_settings(context or "")
        
        # Override with provided values
        if topic:
            settings["title"] = topic
        if num_slides:
            settings["numSlides"] = num_slides
            # Regenerate outline to match slide count
            outline_items = settings.get("outline", [])
            while len(outline_items) < num_slides:
                outline_items.append(f"Topic {len(outline_items) + 1}")
            settings["outline"] = outline_items[:num_slides]
        
        # Emit the title
        yield f"<TITLE>{settings['title']}</TITLE>\n\n"
        
        # Emit outline in markdown format
        for item in settings["outline"]:
            yield f"# {item}\n"
            yield "- Key point about this topic\n"
            yield "- Supporting detail\n\n"
    
    async def generate_outline(
        self,
        prompt: str,
        num_slides: int = 5,
        context: Optional[str] = None
    ) -> dict:
        """Generate outline (legacy non-streaming method)"""
        settings = await self.extract_presentation_settings(context or "")
        
        if prompt:
            settings["title"] = prompt
        
        return {
            "title": settings["title"],
            "outline": settings["outline"][:num_slides]
        }
    
    async def generate_slides(
        self,
        title: str,
        prompt: str,
        outline: List[str],
        context: Optional[str] = None
    ) -> str:
        """Generate slides (legacy non-streaming method)"""
        full_response = ""
        async for chunk in self.generate_slides_stream(
            title, prompt, outline, context
        ):
            full_response += chunk
        return full_response
