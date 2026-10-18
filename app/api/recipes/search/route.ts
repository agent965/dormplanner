import { NextResponse } from "next/server";

export type RecipeSuggestion = {
  name: string;
  description: string;
  imageUrl: string;
  link: string;
};

type MealDbMeal = {
  idMeal: string;
  strMeal: string;
  strCategory?: string | null;
  strArea?: string | null;
  strInstructions?: string | null;
  strMealThumb?: string | null;
  strSource?: string | null;
  strYoutube?: string | null;
  [key: string]: unknown;
};

type DummyRecipe = {
  id: number;
  name: string;
  ingredients?: string[];
  instructions?: string[];
  cuisine?: string;
  mealType?: string[];
  image?: string;
  tags?: string[];
};

const STOP_WORDS = new Set([
  "what",
  "can",
  "i",
  "make",
  "with",
  "for",
  "a",
  "an",
  "the",
  "some",
  "recipe",
  "recipes",
  "dish",
  "dishes",
  "food",
  "foods",
  "cook",
  "cooking",
  "ideas",
  "idea",
  "how",
  "to",
  "do",
  "you",
  "have",
  "any",
  "good",
  "easy",
  "best",
  "quick",
  "simple",
  "dorm",
  "night",
  "party",
  "dinner",
  "lunch",
  "breakfast",
  "snack",
  "snacks",
  "and",
  "or",
  "of",
  "in",
  "on",
  "that",
  "is",
  "are",
  "using",
  "about",
  "tell",
  "me",
  "give",
  "find",
  "search",
  "please",
]);

function extractKeywords(prompt: string): string[] {
  const cleaned = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  return Array.from(new Set(cleaned));
}

function summarizeMeal(meal: MealDbMeal): string {
  const ingList: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const ing = meal[`strIngredient${i}`];
    if (typeof ing === "string" && ing.trim()) {
      ingList.push(ing.trim().toLowerCase());
    }
  }
  const area = meal.strArea ? `${meal.strArea} ` : "";
  const category = meal.strCategory ? meal.strCategory.toLowerCase() : "dish";
  if (ingList.length > 0) {
    return `Flavorful ${area}${category} made with ${ingList.slice(0, 4).join(", ")}.`;
  }
  if (meal.strInstructions) {
    const firstSentence = meal.strInstructions
      .replace(/\s+/g, " ")
      .trim()
      .split(/\.\s+/)[0];
    if (firstSentence && firstSentence.length <= 120) {
      return firstSentence.endsWith(".") ? firstSentence : `${firstSentence}.`;
    }
  }
  return `Classic ${area}${category} recipe great for sharing.`;
}

async function searchMealDbByName(term: string): Promise<RecipeSuggestion[]> {
  try {
    const res = await fetch(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(term)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { meals?: MealDbMeal[] | null };
    if (!data.meals) return [];
    return data.meals.slice(0, 5).map((m) => ({
      name: m.strMeal,
      description: summarizeMeal(m),
      imageUrl:
        m.strMealThumb ||
        "https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg",
      link:
        (m.strSource && m.strSource.trim()) ||
        (m.strYoutube && m.strYoutube.trim()) ||
        `https://www.allrecipes.com/search?q=${encodeURIComponent(m.strMeal)}`,
    }));
  } catch {
    return [];
  }
}

async function searchMealDbByIngredient(
  ingredient: string
): Promise<RecipeSuggestion[]> {
  try {
    const res = await fetch(
      `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      meals?: { idMeal: string; strMeal: string; strMealThumb: string }[] | null;
    };
    if (!data.meals) return [];
    const top = data.meals.slice(0, 3);
    const detailed = await Promise.all(
      top.map(async (item) => {
        try {
          const detailRes = await fetch(
            `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(item.idMeal)}`,
            { signal: AbortSignal.timeout(4000) }
          );
          const detailData = (await detailRes.json()) as {
            meals?: MealDbMeal[] | null;
          };
          const m = detailData.meals?.[0];
          if (m) {
            return {
              name: m.strMeal,
              description: summarizeMeal(m),
              imageUrl: m.strMealThumb || item.strMealThumb,
              link:
                (m.strSource && m.strSource.trim()) ||
                (m.strYoutube && m.strYoutube.trim()) ||
                `https://www.allrecipes.com/search?q=${encodeURIComponent(m.strMeal)}`,
            };
          }
        } catch {
          // fallback to basic summary
        }
        return {
          name: item.strMeal,
          description: `Delicious ${item.strMeal} prepared with ${ingredient}.`,
          imageUrl: item.strMealThumb,
          link: `https://www.allrecipes.com/search?q=${encodeURIComponent(item.strMeal)}`,
        };
      })
    );
    return detailed;
  } catch {
    return [];
  }
}

async function searchDummyRecipes(term: string): Promise<RecipeSuggestion[]> {
  try {
    const res = await fetch(
      `https://dummyjson.com/recipes/search?q=${encodeURIComponent(term)}&limit=5`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { recipes?: DummyRecipe[] };
    if (!data.recipes) return [];
    return data.recipes.map((r) => {
      const cuisine = r.cuisine ? `${r.cuisine} ` : "";
      const ingPreview = (r.ingredients ?? []).slice(0, 4).join(", ").toLowerCase();
      return {
        name: r.name,
        description: ingPreview
          ? `${cuisine}recipe featuring ${ingPreview}.`
          : `Tasty ${cuisine}dish perfect for a dorm gathering.`,
        imageUrl:
          r.image ||
          "https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg",
        link: `https://www.allrecipes.com/search?q=${encodeURIComponent(r.name)}`,
      };
    });
  } catch {
    return [];
  }
}

async function fetchWikiFoodImage(dishName: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(dishName.replace(/\s+/g, "_"))}`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      thumbnail?: { source?: string };
      originalimage?: { source?: string };
    };
    return data.thumbnail?.source ?? data.originalimage?.source ?? null;
  } catch {
    return null;
  }
}

type GeminiResponseData = {
  assistantMessage: string;
  searchTerms: string[];
  dishes: {
    name: string;
    description: string;
    link?: string;
    imageUrl?: string;
  }[];
};

async function askGeminiForRecipes(
  userQuery: string,
  apiKey: string
): Promise<GeminiResponseData | null> {
  try {
    const systemInstruction = `You are a helpful culinary assistant integrated into a college dorm event planner.
The user will ask a question about recipes, dishes, or ingredients.
Respond ONLY with valid JSON matching this structure:
{
  "assistantMessage": "A short, friendly 1-2 sentence response answering their question.",
  "searchTerms": ["keyword1", "keyword2", "keyword3"],
  "dishes": [
    {
      "name": "Recipe Name",
      "description": "A concise 1-sentence appetizing description of the dish and key ingredients.",
      "link": "https://www.allrecipes.com/search?q=Recipe+Name"
    }
  ]
}
Provide 4 to 6 diverse, realistic dishes in "dishes" and 2 to 4 single-word or two-word food/ingredient search terms in "searchTerms".`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemInstruction}\n\nUser query: ${userQuery}` }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.5,
          },
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) return null;
    const json = await res.json();
    const rawText: string | undefined =
      json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;
    const parsed = JSON.parse(rawText) as GeminiResponseData;
    return parsed;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query) {
      return NextResponse.json(
        { error: "Please enter a food, ingredient, or recipe question." },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      "";

    const geminiResult = apiKey ? await askGeminiForRecipes(query, apiKey) : null;

    const keywords = extractKeywords(query);
    const searchTerms = Array.from(
      new Set([
        ...(geminiResult?.searchTerms ?? []),
        query,
        ...keywords,
        ...keywords.map((k) => (k.endsWith("s") ? k.slice(0, -1) : k)),
      ])
    ).slice(0, 6);

    // Search internet recipe APIs concurrently
    const webResultsNested = await Promise.all([
      ...searchTerms.slice(0, 4).map((t) => searchMealDbByName(t)),
      ...searchTerms.slice(0, 4).map((t) => searchDummyRecipes(t)),
      ...keywords.slice(0, 3).map((k) => searchMealDbByIngredient(k)),
    ]);

    const webMap = new Map<string, RecipeSuggestion>();
    for (const list of webResultsNested) {
      for (const item of list) {
        const key = item.name.toLowerCase();
        if (!webMap.has(key)) {
          webMap.set(key, item);
        }
      }
    }

    const finalRecipes: RecipeSuggestion[] = [];
    const seen = new Set<string>();

    // First, enrich any Gemini-suggested dishes with real web images & links
    if (geminiResult?.dishes?.length) {
      for (const dish of geminiResult.dishes) {
        if (!dish.name) continue;
        const lower = dish.name.toLowerCase();
        if (seen.has(lower)) continue;

        const exactWeb = webMap.get(lower);
        if (exactWeb) {
          seen.add(lower);
          finalRecipes.push({
            name: dish.name,
            description: dish.description || exactWeb.description,
            imageUrl: exactWeb.imageUrl,
            link: exactWeb.link,
          });
          continue;
        }

        // Try searching MealDB or Wikipedia for this specific dish name
        const [mealMatches, wikiImg] = await Promise.all([
          searchMealDbByName(dish.name),
          fetchWikiFoodImage(dish.name),
        ]);
        const match = mealMatches[0];
        const imageUrl =
          match?.imageUrl ||
          wikiImg ||
          Array.from(webMap.values())[finalRecipes.length]?.imageUrl ||
          "https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg";
        const link =
          match?.link ||
          dish.link ||
          `https://www.allrecipes.com/search?q=${encodeURIComponent(dish.name)}`;

        seen.add(lower);
        finalRecipes.push({
          name: dish.name,
          description: dish.description,
          imageUrl,
          link,
        });
      }
    }

    // Add remaining real recipes found on the web
    for (const item of webMap.values()) {
      const lower = item.name.toLowerCase();
      if (!seen.has(lower) && finalRecipes.length < 6) {
        seen.add(lower);
        finalRecipes.push(item);
      }
    }

    // If still empty (e.g. very unusual query), fetch popular fallback recipes and tailor to query
    if (finalRecipes.length === 0) {
      const fallback = await searchDummyRecipes("");
      for (const item of fallback.slice(0, 4)) {
        finalRecipes.push(item);
      }
    }

    const assistantMessage =
      geminiResult?.assistantMessage ||
      `Here are ${finalRecipes.length} recipe ideas from the web related to "${query}". Click any recipe link to view full instructions or select a dish to add it to your event!`;

    return NextResponse.json({
      assistantMessage,
      recipes: finalRecipes.slice(0, 6),
    });
  } catch (err) {
    console.error("Recipe search error:", err);
    return NextResponse.json(
      { error: "Failed to search for recipes. Please try again." },
      { status: 500 }
    );
  }
}

