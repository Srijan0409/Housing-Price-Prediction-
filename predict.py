import joblib
import os
import pandas as pd

def predict_price():
    """
    Collects user inputs and predicts the house price based on the pre-trained model.
    """
    print("\n" + "-"*40)
    print("🔮 Housing Price Prediction")
    print("-"*40)
    
    # Ensure the model exists before trying to load it
    if not os.path.exists('model.pkl'):
        print("❌ Error: Trained model ('model.pkl') not found. Please train the model first.")
        return
        
    # Load the pretrained model
    model = joblib.load('model.pkl')
    
    try:
        # Get user input for features
        print("Please enter the house details:")
        area = float(input("➡️  Area (sq ft) [e.g., 3000]: "))
        bedrooms = int(input("➡️  Number of Bedrooms [e.g., 3]: "))
        age = int(input("➡️  Age of the house (years) [e.g., 10]: "))
        
        # We put the input in a pandas DataFrame to match the format it was trained on 
        # (and avoiding scikit-learn warnings)
        input_data = pd.DataFrame([[area, bedrooms, age]], columns=['area', 'bedrooms', 'age'])
        
        # Perform the prediction
        predicted_price = model.predict(input_data)[0]
        
        # Display the result
        print("\n" + "="*45)
        print(f"🏠 Features -> Area: {area:.0f}, Bedrooms: {bedrooms}, Age: {age}")
        print(f"💰 Predict Price -> ${predicted_price:,.2f}")
        print("="*45 + "\n")
        
    except ValueError:
        print("\n❌ Invalid input! Please restart and enter valid numeric values.")

if __name__ == "__main__":
    predict_price()
