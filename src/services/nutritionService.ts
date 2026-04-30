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
    // Spoonacular returns nutrition in result.nutrition
    const nutrition = result.nutrition;
    const foodName = result.category || result.recipes?.[0]?.title || "Identified Food";

    const getNutrient = (name: string) => {
      const n = nutrition?.nutrients?.find((nut: any) => nut.name.toLowerCase() === name.toLowerCase());
      return n ? Math.round(n.amount) : 0;
    };

    return {
      name: foodName.charAt(0).toUpperCase() + foodName.slice(1),
      calories: getNutrient('Calories'),
      protein: getNutrient('Protein'),
      carbs: getNutrient('Carbohydrates'),
      fats: getNutrient('Fat'),
      vitamins: nutrition?.nutrients
        ?.filter((n: any) => n.name.includes('Vitamin') || n.name === 'Iron' || n.name === 'Calcium')
        .slice(0, 4)
        .map((n: any) => n.name) || [],
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
