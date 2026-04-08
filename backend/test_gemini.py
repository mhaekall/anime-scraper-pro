import asyncio
import sys
import os
import io
import contextlib

# Ensure the backend directory is in the python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from services.reconciler import GeminiMatcher
import services.reconciler as reconciler_module

async def main():
    provider_title = "One Piece (Dub)"
    candidates = ["One Piece", "Wan Pisu"]

    print("=== Testing GeminiMatcher ===")
    print(f"Current Model: {reconciler_module.GEMINI_MODEL}")
    print(f"Provider Title: '{provider_title}'")
    print(f"Candidates: {candidates}")
    print("-----------------------------")

    f = io.StringIO()
    with contextlib.redirect_stdout(f):
        matched, best_match = await GeminiMatcher.is_same_anime(provider_title, candidates)
    
    output = f.getvalue()
    if output:
        print(output, end="")

    # If the output contains the specific error message from the try-except block in reconciler.py
    if "[Gemini] Matching error:" in output:
        print("\n[Test] Detected an error from the Gemini API (gemini-2.0-flash).")
        print("[Test] Initiating fallback to gemini-3.0-flash...")
        
        # Apply the fallback model and endpoint
        reconciler_module.GEMINI_MODEL = "gemini-3.0-flash"
        reconciler_module.GEMINI_ENDPOINT = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{reconciler_module.GEMINI_MODEL}:generateContent"
            f"?key={reconciler_module.GEMINI_API_KEY}"
        )
        
        print(f"Updated Model: {reconciler_module.GEMINI_MODEL}")
        
        f2 = io.StringIO()
        with contextlib.redirect_stdout(f2):
            matched, best_match = await GeminiMatcher.is_same_anime(provider_title, candidates)
            
        output2 = f2.getvalue()
        if output2:
            print(output2, end="")
            
        print(f"\n[Fallback Result] Matched: {matched} | Best Match: '{best_match}'")
    else:
        print(f"\n[Result] Matched: {matched} | Best Match: '{best_match}'")
        
        print("\n[Test] To test the fallback manually, we will now force an error...")
        # Break the endpoint to simulate a connection failure
        original_endpoint = reconciler_module.GEMINI_ENDPOINT
        reconciler_module.GEMINI_ENDPOINT = "https://invalid-url.google.com/test"
        
        f4 = io.StringIO()
        with contextlib.redirect_stdout(f4):
            matched_err, best_match_err = await GeminiMatcher.is_same_anime(provider_title, candidates)
        
        # Re-initialize the client to clear the broken endpoint
        await GeminiMatcher.close()
        
        if "[Gemini] Matching error:" in f4.getvalue():
            print("[Test] Error triggered successfully. Falling back to gemini-3.0-flash...")
            # Apply the fallback model and valid endpoint
            reconciler_module.GEMINI_MODEL = "gemini-3.0-flash"
            reconciler_module.GEMINI_ENDPOINT = (
                "https://generativelanguage.googleapis.com/v1beta/models/"
                f"{reconciler_module.GEMINI_MODEL}:generateContent"
                f"?key={reconciler_module.GEMINI_API_KEY}"
            )
            print(f"Updated Model: {reconciler_module.GEMINI_MODEL}")
            
            f5 = io.StringIO()
            with contextlib.redirect_stdout(f5):
                matched, best_match = await GeminiMatcher.is_same_anime(provider_title, candidates)
                
            print(f"[Fallback Result] Matched: {matched} | Best Match: '{best_match}'")

    await GeminiMatcher.close()

if __name__ == "__main__":
    asyncio.run(main())
