try:
    import fastapi
    import uvicorn
    import motor
    import pydantic
    import openai
    from src.main import app
    print("All imports successful!")
except Exception as e:
    import traceback
    traceback.print_exc()
