try:
    print("Attempting to import app.api.server...")
    from app.api.server import app

    print("Import successful!")
except Exception as e:
    import traceback

    traceback.print_exc()
