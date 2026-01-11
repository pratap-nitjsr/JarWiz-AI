"""Presentation generation service using LLM"""
import logging
from typing import List, Optional, AsyncGenerator
import json

logger = logging.getLogger(__name__)

# Outline generation prompt template
OUTLINE_TEMPLATE = """Given the following meeting transcript and conversation context, generate a structured outline for a presentation with {num_slides} main topics in markdown format.

Current Date: {current_date}
Meeting Context:
{context}

User Request: {prompt}

First, generate an appropriate title for the presentation, then create exactly {num_slides} main topics that would make for an engaging and well-structured presentation.

Format the response starting with the title in XML tags, followed by markdown content with each topic as a heading and 2-3 bullet points.

Example format:
<TITLE>Your Generated Presentation Title Here</TITLE>

# First Main Topic
- Key point about this topic
- Another important aspect
- Brief conclusion or impact

# Second Main Topic
- Main insight for this section
- Supporting detail or example
- Practical application or takeaway

Make sure the topics:
1. Flow logically from one to another
2. Cover the key aspects from the meeting/conversation
3. Are clear and concise
4. Are engaging for the audience
5. ALWAYS use bullet points (not paragraphs) and format each point as "- point text"
6. Keep each bullet point brief - just one sentence per point
7. Include exactly 2-3 bullet points per topic"""

# Slides generation prompt template
SLIDES_TEMPLATE = """You are an expert presentation designer. Your task is to create an engaging presentation in XML format.

## CORE REQUIREMENTS
1. FORMAT: Use <SECTION> tags for each slide
2. CONTENT: DO NOT copy outline verbatim - expand with examples, data, and context
3. VARIETY: Each slide must use a DIFFERENT layout component
4. VISUALS: Include detailed image queries (10+ words) on every slide

## PRESENTATION DETAILS
- Title: {title}
- Original Context: {context}
- User Request: {prompt}
- Current Date: {current_date}
- Outline (for reference only): {outline}
- Total Slides: {num_slides}

## PRESENTATION STRUCTURE
```xml
<PRESENTATION>

<!--Every slide must follow this structure (layout determines where the image appears) -->
<SECTION layout="left" | "right" | "vertical">
  <!-- Required: include ONE layout component per slide -->
  <!-- Required: include at least one detailed image query -->
</SECTION>

</PRESENTATION>
```

## SECTION LAYOUTS
Vary the layout attribute in each SECTION tag to control image placement:
- layout="left" - Root image appears on the left side
- layout="right" - Root image appears on the right side
- layout="vertical" - Root image appears at the top

## AVAILABLE LAYOUTS
Choose ONE different layout for each slide:

1. BULLETS: For key points
```xml
<BULLETS>
  <DIV><H3>Main Point 1</H3><P>Description</P></DIV>
  <DIV><H3>Main Point 2</H3><P>Description</P></DIV>
</BULLETS>
```

2. ICONS: For concepts with symbols
```xml
<ICONS>
  <DIV><ICON query="rocket" /><H3>Innovation</H3><P>Description</P></DIV>
  <DIV><ICON query="shield" /><H3>Security</H3><P>Description</P></DIV>
</ICONS>
```

3. TIMELINE: For chronological progression
```xml
<TIMELINE>
  <DIV><H3>Phase 1</H3><P>Description</P></DIV>
  <DIV><H3>Phase 2</H3><P>Description</P></DIV>
</TIMELINE>
```

4. ARROWS: For cause-effect or flows
```xml
<ARROWS>
  <DIV><H3>Challenge</H3><P>Current problem</P></DIV>
  <DIV><H3>Solution</H3><P>Our approach</P></DIV>
  <DIV><H3>Result</H3><P>Outcomes</P></DIV>
</ARROWS>
```

5. PYRAMID: For hierarchical importance
```xml
<PYRAMID>
  <DIV><H3>Vision</H3><P>Our goal</P></DIV>
  <DIV><H3>Strategy</H3><P>Key approaches</P></DIV>
  <DIV><H3>Tactics</H3><P>Implementation</P></DIV>
</PYRAMID>
```

6. BOXES: For simple information tiles
```xml
<BOXES>
  <DIV><H3>Speed</H3><P>Faster delivery.</P></DIV>
  <DIV><H3>Quality</H3><P>Better results.</P></DIV>
</BOXES>
```

7. COMPARE: For side-by-side comparison
```xml
<COMPARE>
  <DIV><H3>Option A</H3><LI>Feature 1</LI><LI>Feature 2</LI></DIV>
  <DIV><H3>Option B</H3><LI>Feature 3</LI><LI>Feature 4</LI></DIV>
</COMPARE>
```

8. IMAGES: Most slides need at least one detailed image query
```xml
<IMG query="modern office meeting room with diverse team collaborating on presentation with digital displays" />
```

## CRITICAL RULES
1. Generate exactly {num_slides} slides. NOT MORE NOT LESS!
2. NEVER repeat layouts in consecutive slides
3. DO NOT copy outline verbatim - expand and enhance
4. Include at least one detailed image query in most slides
5. Vary the SECTION layout attribute (left/right/vertical) throughout

Now create a complete XML presentation with {num_slides} slides that expands on the outline."""


class PresentationService:
    """Service for generating presentations from meeting context"""
    
    def __init__(self, llm_service):
        """
        Initialize presentation service
        
        Args:
            llm_service: LLM service for text generation
        """
        self.llm_service = llm_service
        logger.info("PresentationService initialized")
    
    async def generate_topic_from_context(self, context: str) -> str:
        """
        Generate a presentation topic automatically from meeting context
        
        Args:
            context: Meeting transcript and chat history
            
        Returns:
            Suggested presentation topic
        """
        if not context or len(context.strip()) < 50:
            return "Meeting Summary"
        
        prompt = f"""Based on the following meeting transcript and discussion, suggest a concise and descriptive presentation title (5-10 words max).

Meeting Content:
{context[:3000]}

Respond with ONLY the title, nothing else. Make it professional and specific to the content discussed."""

        try:
            response = await self.llm_service.generate_simple_answer(
                query=prompt,
                context=""
            )
            # Clean up the response
            topic = response.strip().strip('"\'')
            return topic if topic else "Meeting Summary"
        except Exception as e:
            logger.error(f"Error generating topic: {e}")
            return "Meeting Summary"
    
    async def generate_outline_stream(
        self,
        topic: str,
        num_slides: int = 5,
        context: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Generate a presentation outline from meeting context (streaming)
        
        Args:
            topic: Presentation topic
            num_slides: Number of slides to generate
            context: Meeting transcript and chat history
            
        Yields:
            Text chunks as they are generated
        """
        from datetime import datetime
        
        current_date = datetime.now().strftime("%A, %B %d, %Y")
        
        formatted_prompt = OUTLINE_TEMPLATE.format(
            num_slides=num_slides,
            current_date=current_date,
            context=context or "No specific meeting context provided.",
            prompt=topic
        )
        
        logger.info(f"Starting outline generation for topic: {topic}")
        
        try:
            # Stream the outline using LLM's long content stream method
            chunk_count = 0
            async for chunk in self.llm_service.generate_long_content_stream(formatted_prompt):
                chunk_count += 1
                if chunk_count == 1:
                    logger.info("First outline chunk received")
                yield chunk
            
            logger.info(f"Outline generation completed with {chunk_count} chunks")
                    
        except Exception as e:
            logger.error(f"Error generating outline stream: {e}", exc_info=True)
            raise
    
    async def generate_outline(
        self,
        prompt: str,
        num_slides: int = 5,
        context: Optional[str] = None
    ) -> dict:
        """
        Generate a presentation outline from meeting context (non-streaming)
        
        Args:
            prompt: User's presentation request
            num_slides: Number of slides to generate
            context: Meeting transcript and chat history
            
        Returns:
            Dictionary with title and outline topics
        """
        from datetime import datetime
        
        current_date = datetime.now().strftime("%A, %B %d, %Y")
        
        formatted_prompt = OUTLINE_TEMPLATE.format(
            num_slides=num_slides,
            current_date=current_date,
            context=context or "No specific meeting context provided.",
            prompt=prompt
        )
        
        try:
            # Generate outline using LLM's ainvoke method
            response = await self.llm_service.llm.ainvoke(formatted_prompt)
            
            # Parse the response to extract title and outline
            result = self._parse_outline_response(response.content)
            return result
            
        except Exception as e:
            logger.error(f"Error generating outline: {e}")
            raise
    
    def _parse_outline_response(self, response: str) -> dict:
        """Parse the outline response to extract title and topics"""
        title = "Meeting Summary Presentation"
        outline = []
        
        # Extract title from <TITLE> tags
        if "<TITLE>" in response and "</TITLE>" in response:
            start = response.index("<TITLE>") + len("<TITLE>")
            end = response.index("</TITLE>")
            title = response[start:end].strip()
        
        # Extract topics (lines starting with #)
        lines = response.split("\n")
        current_topic = None
        current_bullets = []
        
        for line in lines:
            line = line.strip()
            if line.startswith("# "):
                # Save previous topic if exists
                if current_topic:
                    topic_with_bullets = current_topic + "\n" + "\n".join(current_bullets)
                    outline.append(topic_with_bullets)
                
                current_topic = line[2:]  # Remove "# "
                current_bullets = []
            elif line.startswith("- ") and current_topic:
                current_bullets.append(line)
        
        # Don't forget the last topic
        if current_topic:
            topic_with_bullets = current_topic + "\n" + "\n".join(current_bullets)
            outline.append(topic_with_bullets)
        
        return {
            "title": title,
            "outline": outline
        }
    
    async def generate_slides_stream(
        self,
        title: str,
        prompt: str,
        outline: List[str],
        context: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Generate presentation slides one at a time as a stream
        
        Args:
            title: Presentation title
            prompt: User's original request
            outline: List of outline topics
            context: Meeting context
            
        Yields:
            XML chunks for parsing
        """
        from datetime import datetime
        
        current_date = datetime.now().strftime("%A, %B %d, %Y")
        num_slides = len(outline) if outline else 5
        
        logger.info(f"Starting slides generation for title: {title}, num_slides: {num_slides}")
        
        # Track used layouts to ensure variety
        used_layouts = []
        all_layouts = ["BULLETS", "ICONS", "TIMELINE", "ARROWS", "PYRAMID", "BOXES", "COMPARE"]
        section_layouts = ["left", "right", "vertical"]
        
        # Start the presentation XML
        yield "<PRESENTATION>\n"
        
        # Generate each slide one at a time
        for i, topic in enumerate(outline):
            # Avoid recently used layouts
            available_layouts = [l for l in all_layouts if l not in used_layouts[-2:]] if len(used_layouts) >= 2 else all_layouts
            section_layout = section_layouts[i % len(section_layouts)]
            
            slide_prompt = self._create_single_slide_prompt(
                title=title,
                topic=topic,
                slide_number=i + 1,
                total_slides=num_slides,
                context=context,
                current_date=current_date,
                available_layouts=available_layouts,
                section_layout=section_layout,
                previous_slides_summary=f"Slides so far used layouts: {', '.join(used_layouts)}" if used_layouts else "This is the first slide."
            )
            
            logger.info(f"Generating slide {i + 1}/{num_slides}: {topic[:50]}...")
            
            try:
                # Generate single slide
                slide_content = ""
                async for chunk in self.llm_service.generate_long_content_stream(slide_prompt):
                    slide_content += chunk
                    yield chunk
                
                # Track the layout used
                for layout in all_layouts:
                    if f"<{layout}>" in slide_content.upper():
                        used_layouts.append(layout)
                        break
                
                # Add newline between slides
                yield "\n"
                
                logger.info(f"Slide {i + 1} generated successfully")
                
            except Exception as e:
                logger.error(f"Error generating slide {i + 1}: {e}")
                # Continue with next slide on error
                continue
        
        # Close the presentation
        yield "</PRESENTATION>"
        
        logger.info(f"Slides generation completed, generated {num_slides} slides")
    
    def _create_single_slide_prompt(
        self,
        title: str,
        topic: str,
        slide_number: int,
        total_slides: int,
        context: Optional[str],
        current_date: str,
        available_layouts: List[str],
        section_layout: str,
        previous_slides_summary: str
    ) -> str:
        """Create prompt for generating a single slide"""
        return f"""You are an expert presentation designer. Generate ONE slide in XML format.

## PRESENTATION INFO
- Title: {title}
- Current Slide: {slide_number} of {total_slides}
- Context: {context[:500] if context else "General presentation"}
- Date: {current_date}

## THIS SLIDE'S TOPIC
{topic}

## REQUIREMENTS
1. Generate ONLY ONE <SECTION> tag for this slide
2. Use layout="{section_layout}" for image placement
3. Choose ONE layout component from: {', '.join(available_layouts)}
4. Include a detailed image query (10+ words) relevant to this topic
5. {previous_slides_summary}

## AVAILABLE LAYOUTS
{self._get_layout_examples(available_layouts)}

## OUTPUT FORMAT
Generate ONLY the XML for this one slide:
```xml
<SECTION layout="{section_layout}">
  <!-- Your content here using ONE of the available layouts -->
  <IMG query="detailed image description for this slide topic" />
</SECTION>
```

Generate the slide now. Output ONLY the XML, nothing else."""

    def _get_layout_examples(self, layouts: List[str]) -> str:
        """Get example XML for specified layouts"""
        examples = {
            "BULLETS": '''BULLETS: For key points
<BULLETS>
  <DIV><H3>Point 1</H3><P>Description</P></DIV>
  <DIV><H3>Point 2</H3><P>Description</P></DIV>
</BULLETS>''',
            "ICONS": '''ICONS: For concepts with symbols
<ICONS>
  <DIV><ICON query="rocket" /><H3>Concept</H3><P>Description</P></DIV>
</ICONS>''',
            "TIMELINE": '''TIMELINE: For progression
<TIMELINE>
  <DIV><H3>Phase 1</H3><P>Description</P></DIV>
  <DIV><H3>Phase 2</H3><P>Description</P></DIV>
</TIMELINE>''',
            "ARROWS": '''ARROWS: For cause-effect
<ARROWS>
  <DIV><H3>Challenge</H3><P>Problem</P></DIV>
  <DIV><H3>Solution</H3><P>Approach</P></DIV>
</ARROWS>''',
            "PYRAMID": '''PYRAMID: For hierarchy
<PYRAMID>
  <DIV><H3>Vision</H3><P>Goal</P></DIV>
  <DIV><H3>Strategy</H3><P>Approach</P></DIV>
</PYRAMID>''',
            "BOXES": '''BOXES: For information tiles
<BOXES>
  <DIV><H3>Item 1</H3><P>Detail</P></DIV>
  <DIV><H3>Item 2</H3><P>Detail</P></DIV>
</BOXES>''',
            "COMPARE": '''COMPARE: For side-by-side
<COMPARE>
  <DIV><H3>Option A</H3><LI>Feature 1</LI></DIV>
  <DIV><H3>Option B</H3><LI>Feature 2</LI></DIV>
</COMPARE>'''
        }
        return "\n\n".join([examples[l] for l in layouts if l in examples])
    
    async def generate_slides(
        self,
        title: str,
        prompt: str,
        outline: List[str],
        context: Optional[str] = None
    ) -> str:
        """
        Generate complete presentation slides (non-streaming)
        
        Args:
            title: Presentation title
            prompt: User's original request
            outline: List of outline topics
            context: Meeting context
            
        Returns:
            Complete XML presentation string
        """
        full_response = ""
        async for chunk in self.generate_slides_stream(title, prompt, outline, context):
            full_response += chunk
        
        return full_response
