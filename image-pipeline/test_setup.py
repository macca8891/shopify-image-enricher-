#!/usr/bin/env python3
"""
Test script to verify the image pipeline setup
"""

import os
import sys
from pathlib import Path

def test_imports():
    """Test that all required modules can be imported"""
    try:
        import requests
        import PIL
        from PIL import Image, ImageDraw, ImageFont
        import aiohttp
        from dotenv import load_dotenv
        print("✅ All required modules imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Run: pip install -r requirements.txt")
        return False

def test_env_file():
    """Test that .env file exists and has required variables"""
    env_path = Path(".env")
    if not env_path.exists():
        print("❌ .env file not found")
        print("Run: cp env.example .env")
        return False
    
    load_dotenv()
    
    required_vars = ['REMOVE_BG_API_KEY', 'SHOP_DOMAIN']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("Please update your .env file with the required values")
        return False
    
    print("✅ Environment variables configured")
    return True

def test_csv_file():
    """Test that sample CSV file exists and is readable"""
    csv_path = Path("data/input.csv")
    if not csv_path.exists():
        print("❌ Sample CSV file not found at data/input.csv")
        return False
    
    try:
        import csv
        with open(csv_path, 'r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            if len(rows) == 0:
                print("❌ CSV file is empty")
                return False
            print(f"✅ CSV file loaded successfully ({len(rows)} rows)")
            return True
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        return False

def test_assets():
    """Test that asset files exist"""
    assets_dir = Path("assets")
    if not assets_dir.exists():
        print("❌ Assets directory not found")
        return False
    
    logo_path = assets_dir / "logo.png"
    watermark_path = assets_dir / "watermark.png"
    
    if not logo_path.exists():
        print("❌ Logo file not found at assets/logo.png")
        return False
    
    if not watermark_path.exists():
        print("❌ Watermark file not found at assets/watermark.png")
        return False
    
    print("✅ Asset files found")
    return True

def main():
    """Run all tests"""
    print("🧪 Testing Shopify Image Pipeline Setup\n")
    
    tests = [
        ("Module Imports", test_imports),
        ("Environment File", test_env_file),
        ("CSV File", test_csv_file),
        ("Asset Files", test_assets)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"Testing {test_name}...")
        if test_func():
            passed += 1
        print()
    
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Your setup is ready.")
        print("\nNext steps:")
        print("1. Update your .env file with real API credentials")
        print("2. Test with dry run: python process_images.py --input data/input.csv --dry-run")
        print("3. Process your first batch!")
    else:
        print("❌ Some tests failed. Please fix the issues above before proceeding.")
        sys.exit(1)

if __name__ == '__main__':
    main()







