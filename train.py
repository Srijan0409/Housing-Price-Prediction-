import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
import joblib
import os

def train_model():
    """
    Loads data, trains the Linear Regression model, and saves it.
    """
    print("\n" + "-"*40)
    print("🧠 Training the Housing Price Model")
    print("-"*40)
    
    # 1. Load the dataset
    data_path = 'data.csv'
    if not os.path.exists(data_path):
        print(f"❌ Error: {data_path} not found!")
        return None
        
    df = pd.read_csv(data_path)
    print("✅ Dataset loaded successfully!\n")
    
    # 2. Basic data exploration (Beginner-friendly insights)
    print("📊 Dataset Overview (First 5 rows):")
    print(df.head())
    
    print("\nℹ️ Dataset Info:")
    df.info()
    
    print("\n🔍 Checking for missing values:")
    print(df.isnull().sum())
    
    # 3. Define features (X) and target (y)
    # The mathematical formula is: y = w1*area + w2*bedrooms + w3*age + b
    # X contains our independent variables, y contains our dependent variable (what we want to predict)
    X = df[['area', 'bedrooms', 'age']]
    y = df['price']
    
    # 4. Split dataset into training and testing (80% train, 20% test)
    # This leaves 20% of data unseen by the model to test its actual performance
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"\n📈 Splitting data -> Training samples: {len(X_train)}, Testing samples: {len(X_test)}")
    
    # 5. Train the model using Linear Regression
    print("⚙️ Initializing and training Linear Regression model...")
    model = LinearRegression()
    model.fit(X_train, y_train) # Here the model learns the weights (w) and bias (b) from the data
    
    # 6. Make predictions on the test data
    y_pred = model.predict(X_test)
    
    # 7. Evaluate model (Mean Squared Error compares predicted vs actual prices)
    mse = mean_squared_error(y_test, y_pred)
    print(f"\n📉 Evaluation -> Mean Squared Error (MSE): {mse:,.2f}")
    
    # 8. Print model coefficients and intercept
    # Unpacking the math: price = (w1 * area) + (w2 * bedrooms) + (w3 * age) + intercept
    print("\n🧮 Model Equation learned from data:")
    print(f"Price = ({model.coef_[0]:.2f} * area) + "
          f"({model.coef_[1]:.2f} * bedrooms) + "
          f"({model.coef_[2]:.2f} * age) + "
          f"({model.intercept_:.2f} [Base Price])")
    
    # Save the model for later use so we don't have to train it every time we predict
    joblib.dump(model, 'model.pkl')
    print("\n💾 Model successfully saved as 'model.pkl'!")
    
    return model

if __name__ == "__main__":
    train_model()
