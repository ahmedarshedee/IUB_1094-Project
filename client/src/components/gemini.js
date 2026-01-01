/**
 * AI Integration - Multi-Provider Support
 * Supports: Gemini, OpenAI, Claude
 * Calls the server-side API endpoint to generate content
 */

export async function generatePostWithGemini(prompt, provider = 'groq') {
  // Prevent multiple simultaneous requests
  if (generatePostWithGemini._inFlight) {
    throw new Error('Please wait for the current AI request to finish.');
  }

  generatePostWithGemini._inFlight = true;

  try {
    console.log(
      '[Gemini Client] Sending request with prompt:',
      prompt.substring(0, 50)
    );

    // Use relative URL to work with Vite proxy
    const url = '/api/ai/generate';

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({ prompt, provider }),
      });
    } catch (fetchError) {
      console.error('[Gemini Client] Fetch error:', fetchError);
      throw new Error(`Network error: ${fetchError.message}. Please check if the server is running on http://localhost:5000`);
    }

    const responseText = await response.text();
    console.log('[Gemini Client] Response status:', response.status);
    console.log(
      '[Gemini Client] Response preview:',
      responseText.substring(0, 200)
    );

    if (!response.ok) {
      let errorMessage = 'Failed to generate content';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // If response is not JSON, use the raw text or status
        errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`;
      }
      
      // Provide more specific error messages
      if (response.status === 404) {
        errorMessage = 'AI endpoint not found. Please check if the server is running and the route is correct.';
      } else if (response.status === 500) {
        errorMessage = errorMessage || 'Server error. Please check server logs for details.';
      }
      
      throw new Error(errorMessage);
    }

    // Parse response
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('[Gemini Client] JSON parse error:', parseErr);
      throw new Error('Invalid response from server');
    }

    // Extract generated text
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('[Gemini Client] No text in response:', result);
      throw new Error('No text generated. Please try again.');
    }

    console.log('[Gemini Client] Successfully generated text');
    return text.trim();
  } catch (error) {
    console.error('[Gemini Client] Error:', error);
    throw error;
  } finally {
    generatePostWithGemini._inFlight = false;
  }
}
