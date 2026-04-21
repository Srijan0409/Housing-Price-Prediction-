from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import os
import pandas as pd
import math

app = FastAPI(title="Housing Price Predictor API")

# Allows the frontend (running on a different port or file) to access this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the model
# We determine path assuming app.py is in /backend and model.pkl is in root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, 'model.pkl')
DATA_PATH = os.path.join(BASE_DIR, 'data.csv')

try:
    model = joblib.load(MODEL_PATH)
except Exception as e:
    model = None
    print(f"Warning: Could not load model from {MODEL_PATH}. Error: {e}")

# Pydantic schema for the prediction input
class HouseFeatures(BaseModel):
    area: float
    bedrooms: int
    age: int

@app.get("/")
def read_root():
    return {"message": "Welcome to the Housing Price Predictor API!"}

@app.post("/predict")
def predict_price(features: HouseFeatures):
    if model is None:
        raise HTTPException(status_code=500, detail="Model is not loaded. Please train it first.")
    
    # Create pandas dataframe matching training structures
    input_data = pd.DataFrame([
        [features.area, features.bedrooms, features.age]
    ], columns=['area', 'bedrooms', 'age'])
    
    # Predict Price
    prediction = model.predict(input_data)[0]
    
    # Optional: we can apply a floor or ceil to make it realistic 
    price = round(prediction, 2)
    
    return {"predicted_price": price}

@app.get("/model_info")
def get_model_info():
    if model is None:
        raise HTTPException(status_code=500, detail="Model is not loaded.")
    
    # Assuming standard Linear Regression mapping: area, bedrooms, age
    w1, w2, w3 = model.coef_
    b = model.intercept_
    
    return {
        "formula": f"Price = ({w1:.2f} × Area) + ({w2:.2f} × Bedrooms) + ({w3:.2f} × Age) + {b:.2f}",
        "weights": {
            "area": w1,
            "bedrooms": w2,
            "age": w3
        },
        "intercept": b
    }

@app.get("/data")
def get_data():
    if not os.path.exists(DATA_PATH):
        raise HTTPException(status_code=404, detail="Dataset not found.")
        
    df = pd.read_csv(DATA_PATH)
    # Convert to a list of dicts for frontend graphs
    data_list = df.to_dict(orient='records')
    return {"data": data_list}
