import axios from 'axios';

/**
 * MSCureChain - Unified Nutrition Service (Spoonacular Only)
 * 
 * We are now using ONLY Spoonacular because:
 * 1. It has a high-quality database for Indian food (Dosa, Idli, etc.)
 * 2. It returns both the food name AND nutrition in a single call.
 * 3. It's much more stable than the USDA API for international foods.
 */

export interface NutrientInfo {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  vitamins: string[];
}

export const analyzeFood = async (data: string, base64Image?: string): Promise<NutrientInfo | null> => {
  try {
    const SPOONACULAR_API_KEY = (process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY || '').trim();
    
    if (!SPOONACULAR_API_KEY || SPOONACULAR_API_KEY === 'YOUR_SPOONACULAR_API_KEY') {
      console.error('[NutritionService] Spoonacular API Key is missing');
      return getPlaceholderData("Please add API Key");
    }

    console.log(`[NutritionService] Identifying food... (Key: ${SPOONACULAR_API_KEY.substring(0, 5)}***)`);

    // Prepare FormData
    const formData = new FormData();
    formData.append('file', {
      uri: `data:image/jpeg;base64,${base64Image}`,
      type: 'image/jpeg',
      name: 'food.jpg',
    } as any);

    // Call Spoonacular Analyze (this gives Name + Nutrition in one go)
    const response = await fetch(
      `https://api.spoonacular.com/food/images/analyze?apiKey=${SPOONACULAR_API_KEY}`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[NutritionService] API Error:', errorText);
      return getPlaceholderData("Scan failed");
    }

    const result = await response.json();
    console.log('[NutritionService] Full Result:', JSON.stringify(result, null, 2));

    // Get nutrition from the result
    // Spoonacular returns nutrition in result.nutrition with direct keys like calories, fat, protein, carbs
    const nutrition = result.nutrition;
    
    // category can be an object { name: "...", probability: ... } or a string
    let foodName = "Identified Food";
    const categoryName = typeof result.category === 'object' ? result.category.name : result.category;
    
    // 🔍 ENHANCEMENT: Context-Aware Identification
    // Since Dosa/Idli often get misidentified as 'crepes' or 'omelette' by general AI,
    // we scan the associated recipes for regional keywords to improve accuracy.
    const regionalKeywords = ['dosa', 'idli', 'vada', 'paratha', 'roti', 'paneer', 'biryani', 'poha', 'upma', 'samosa', 'dal', 'curry'];
    const suggestedRecipes = result.recipes || [];
    const regionalMatch = suggestedRecipes.find((r: any) => 
      regionalKeywords.some(key => r.title.toLowerCase().includes(key))
    );

    if (regionalMatch) {
      // If a recipe title contains a regional keyword, it's likely more accurate than a generic category
      foodName = regionalMatch.title;
    } else if (categoryName) {
      foodName = categoryName;
    } else if (suggestedRecipes[0]?.title) {
      foodName = suggestedRecipes[0].title;
    }

    const getNutrient = (key: string) => {
      // Structure: nutrition.calories.value
      const n = nutrition?.[key.toLowerCase()];
      return n?.value ? Math.round(n.value) : 0;
    };

    return {
      name: foodName.charAt(0).toUpperCase() + foodName.slice(1),
      calories: getNutrient('Calories'),
      protein: getNutrient('Protein'),
      carbs: getNutrient('Carbs'),
      fats: getNutrient('Fat'),
      vitamins: [], // These aren't in the summary analyze result usually
    };

  } catch (error: any) {
    console.error('[NutritionService] System Error:', error.message);
    return getPlaceholderData("Network Error");
  }
};

const getPlaceholderData = (msg: string): NutrientInfo => {
  return {
    name: msg,
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    vitamins: [],
  };
};

export const analyzeVitals = async (vitals: any): Promise<string | null> => {
  const { bp_systolic, bp_diastolic, blood_sugar } = vitals;
  if (bp_systolic > 140) return "BP is high. Stay calm and drink water.";
  if (blood_sugar > 180) return "Sugar is high. Avoid sweets.";
  return "Vitals look stable.";
};
