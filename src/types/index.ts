import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

// Meal food item type
export interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  saturatedFat?: number;
  unsaturatedFat?: number;
  sugars?: number;
  sodium?: number;
  caffeine?: number;
  alcohol?: number;
  quantity?: number;
  unit?: string;
}

// Workout exercise type
export interface WorkoutExercise {
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  restTime?: number;
  notes?: string;
}

// Recipe ingredient type
export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

// Meal plan day type
export interface MealPlanDay {
  day: number;
  breakfast?: FoodItem[];
  lunch?: FoodItem[];
  dinner?: FoodItem[];
  snacks?: FoodItem[];
}

// Message attachment type
export interface MessageAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

// AI message type
export interface AIMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// Notification rule conditions
export interface NotificationRuleConditions {
  days?: number;
  targetType?: "protein" | "carbs" | "fats" | "calories" | "water" | "steps";
  threshold?: number;
  milestone?: number;
  scheduleType?: "daily" | "weekly" | "monthly";
  scheduleTime?: string;
}

// Report filters
export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  clientIds?: string[];
  teamIds?: string[];
  status?: string[];
}
