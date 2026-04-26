import os
import pandas as pd
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS(app, origins=["https://visionary-salmiakki-6f80e3.netlify.app"])
from sklearn.metrics import r2_score, mean_squared_error

app = Flask(__name__)
# Enable CORS
CORS(app)

# Load the model
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'model.pkl')
DATA_PATH = os.path.join(BASE_DIR, 'data.csv')

try:
    model = joblib.load(MODEL_PATH)
except Exception as e:
    model = None
    print(f"Warning: Could not load model from {MODEL_PATH}. Error: {e}")

# Calculate global metrics
global_r2 = 0.0
global_mse = 0.0
if model is not None and os.path.exists(DATA_PATH):
    try:
        df = pd.read_csv(DATA_PATH)
        X = df[['area', 'bedrooms', 'age']]
        y_true = df['price']
        y_pred = model.predict(X)
        global_r2 = float(r2_score(y_true, y_pred))
        global_mse = float(mean_squared_error(y_true, y_pred))
    except Exception as e:
        print(f"Warning: Could not calculate metrics. Error: {e}")

@app.route("/", methods=["GET"])
def read_root():
    return jsonify({"message": "Welcome to the Housing Price Predictor API!"})

@app.route("/predict", methods=["POST"])
def predict_price():
    if model is None:
        return jsonify({"error": "Model is not loaded. Please train it first."}), 500
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "No input data provided"}), 400
        
    area = data.get('area')
    bedrooms = data.get('bedrooms')
    age = data.get('age')
    
    if area is None or bedrooms is None or age is None:
        return jsonify({"error": "Missing required fields: area, bedrooms, age"}), 400
        
    try:
        area = float(area)
        bedrooms = int(bedrooms)
        age = int(age)
    except ValueError:
        return jsonify({"error": "Invalid input types. Please provide numbers."}), 400

    # Input validation
    if area <= 0 or bedrooms <= 0 or age < 0:
        return jsonify({"error": "Invalid inputs. Area and bedrooms must be positive, age cannot be negative."}), 400

    # Create pandas dataframe matching training structures
    input_data = pd.DataFrame([
        [area, bedrooms, age]
    ], columns=['area', 'bedrooms', 'age'])
    
    # Predict Price
    prediction = model.predict(input_data)[0]
    price = round(float(prediction), 2)
    
    # Extract coefficients safely
    w1, w2, w3 = [float(w) for w in model.coef_]
    b = float(model.intercept_)
    
    return jsonify({
        "predicted_price": price,
        "model_coefficients": {
            "area": w1,
            "bedrooms": w2,
            "age": w3,
            "intercept": b
        },
        "r2_score": global_r2,
        "mse": global_mse
    })

@app.route("/model_info", methods=["GET"])
def get_model_info():
    if model is None:
        return jsonify({"error": "Model is not loaded."}), 500
    
    w1, w2, w3 = [float(w) for w in model.coef_]
    b = float(model.intercept_)
    
    return jsonify({
        "formula": f"Price = ({w1:.2f} × Area) + ({w2:.2f} × Bedrooms) + ({w3:.2f} × Age) + {b:.2f}",
        "weights": {
            "area": w1,
            "bedrooms": w2,
            "age": w3
        },
        "intercept": b
    })

@app.route("/data", methods=["GET"])
def get_data():
    if not os.path.exists(DATA_PATH):
        return jsonify({"error": "Dataset not found."}), 404
        
    df = pd.read_csv(DATA_PATH)
    data_list = df.to_dict(orient='records')
    return jsonify({"data": data_list})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
