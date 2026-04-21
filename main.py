from train import train_model
from predict import predict_price
import sys
import os
import pandas as pd

def show_visualization():
    """
    Generates a scatter plot of Area vs Price and saves it as an image.
    Requires matplotlib.
    """
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        print("❌ Error: Matplotlib isn't installed. Run: pip install matplotlib")
        return
        
    print("\n" + "-"*40)
    print("📈 Data Visualization")
    print("-"*40)
    
    data_path = 'data.csv'
    if not os.path.exists(data_path):
        print(f"❌ Error: {data_path} not found!")
        return
        
    df = pd.read_csv(data_path)
    
    # Define a figure with specific size
    plt.figure(figsize=(10, 6))
    
    # Plot relationship between area and price
    plt.scatter(df['area'], df['price'], color='teal', alpha=0.7, edgecolors='k', s=80)
    plt.title('House Price depending on Area', fontsize=14, pad=15)
    plt.xlabel('Area (sq ft)', fontsize=12)
    plt.ylabel('Price (USD)', fontsize=12)
    plt.grid(True, linestyle='--', alpha=0.6)
    
    # Using plt.savefig instead of plt.show() ensures the script doesn't hang in text interfaces
    image_name = 'area_vs_price_chart.png'
    plt.savefig(image_name)
    plt.close()
    print(f"✅ Visualization created and saved in your directory as '{image_name}'")

def main():
    while True:
        print("\n" + "*"*45)
        print("  🏡 HOUSING PRICE PREDICTOR SYSTEM  ")
        print("*"*45)
        print("1. 🧠 Train the Machine Learning Model")
        print("2. 🔮 Predict a House Price")
        print("3. 📈 Generate Dataset Visualizations")
        print("4. 👋 Exit")
        print("*"*45)
        
        choice = input("Enter your choice (1/2/3/4): ")
        
        if choice == '1':
            train_model()
        elif choice == '2':
            predict_price()
        elif choice == '3':
            show_visualization()
        elif choice == '4':
            print("\nExiting program. Happy Coding! 👋")
            sys.exit(0)
        else:
            print("\n❌ Invalid choice. Please try again.")

if __name__ == "__main__":
    main()
