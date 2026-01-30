import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { addDays, subDays, format } from "date-fns";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  // Clean up existing data
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationRule.deleteMany();
  await prisma.aIConversation.deleteMany();
  await prisma.report.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.package.deleteMany();
  await prisma.clientWorkout.deleteMany();
  await prisma.clientRecipe.deleteMany();
  await prisma.clientMealPlan.deleteMany();
  await prisma.workout.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.mealPlan.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.dailyLog.deleteMany();
  await prisma.weightLog.deleteMany();
  await prisma.clientLicense.deleteMany();
  await prisma.client.deleteMany();
  await prisma.team.deleteMany();
  await prisma.coach.deleteMany();

  console.log("✅ Cleaned up existing data");

  // Create demo coach
  const coach = await prisma.coach.create({
    data: {
      email: "demo@cratox.ai",
      name: "Alex Thompson",
      passwordHash: "hashed_demo123",
      businessName: "Thompson Fitness",
      phone: "+1 (555) 123-4567",
      timezone: "America/New_York",
      primaryColor: "#6366f1",
      accentColor: "#8b5cf6",
    },
  });

  console.log("✅ Created demo coach:", coach.email);

  // Create teams
  const teams = await Promise.all([
    prisma.team.create({
      data: {
        coachId: coach.id,
        name: "Weight Loss Program",
        description: "Clients focused on losing weight",
        color: "#ef4444",
      },
    }),
    prisma.team.create({
      data: {
        coachId: coach.id,
        name: "Muscle Building",
        description: "Clients focused on gaining muscle",
        color: "#3b82f6",
      },
    }),
    prisma.team.create({
      data: {
        coachId: coach.id,
        name: "General Fitness",
        description: "Clients maintaining overall fitness",
        color: "#22c55e",
      },
    }),
  ]);

  console.log("✅ Created teams");

  // Sample client data
  const clientsData = [
    {
      name: "Sarah Johnson",
      email: "sarah.johnson@email.com",
      age: 32,
      gender: "FEMALE" as const,
      heightCm: 165,
      goalType: "WEIGHT_LOSS" as const,
      startWeight: 78,
      targetWeight: 65,
      currentWeight: 72,
      targetCalories: 1600,
      proteinTarget: 120,
      proteinPercentage: 30,
      carbsTarget: 160,
      carbsPercentage: 40,
      fatsTarget: 53,
      fatsPercentage: 30,
      exerciseFrequency: "THREE" as const,
      exerciseIntensity: "MODERATE" as const,
      exerciseDuration: "THIRTY_TO_FORTYFIVE" as const,
      stepsGoal: 10000,
      waterIntakeGoal: 8,
      exerciseMinutesGoal: 45,
      teamId: teams[0].id,
    },
    {
      name: "Mike Chen",
      email: "mike.chen@email.com",
      age: 28,
      gender: "MALE" as const,
      heightCm: 178,
      goalType: "WEIGHT_GAIN" as const,
      startWeight: 70,
      targetWeight: 80,
      currentWeight: 74,
      targetCalories: 2800,
      proteinTarget: 175,
      proteinPercentage: 25,
      carbsTarget: 350,
      carbsPercentage: 50,
      fatsTarget: 78,
      fatsPercentage: 25,
      exerciseFrequency: "FOUR_PLUS" as const,
      exerciseIntensity: "INTENSE" as const,
      exerciseDuration: "SIXTY_PLUS" as const,
      stepsGoal: 8000,
      waterIntakeGoal: 10,
      exerciseMinutesGoal: 60,
      teamId: teams[1].id,
    },
    {
      name: "Emma Williams",
      email: "emma.williams@email.com",
      age: 45,
      gender: "FEMALE" as const,
      heightCm: 160,
      goalType: "WEIGHT_LOSS" as const,
      startWeight: 85,
      targetWeight: 70,
      currentWeight: 80,
      targetCalories: 1400,
      proteinTarget: 105,
      proteinPercentage: 30,
      carbsTarget: 140,
      carbsPercentage: 40,
      fatsTarget: 47,
      fatsPercentage: 30,
      exerciseFrequency: "TWO" as const,
      exerciseIntensity: "EASY" as const,
      exerciseDuration: "THIRTY_TO_FORTYFIVE" as const,
      stepsGoal: 7000,
      waterIntakeGoal: 8,
      exerciseMinutesGoal: 30,
      teamId: teams[0].id,
    },
    {
      name: "David Park",
      email: "david.park@email.com",
      age: 35,
      gender: "MALE" as const,
      heightCm: 182,
      goalType: "MAINTAIN_WEIGHT" as const,
      startWeight: 82,
      targetWeight: 82,
      currentWeight: 83,
      targetCalories: 2400,
      proteinTarget: 150,
      proteinPercentage: 25,
      carbsTarget: 300,
      carbsPercentage: 50,
      fatsTarget: 67,
      fatsPercentage: 25,
      exerciseFrequency: "THREE" as const,
      exerciseIntensity: "MODERATE" as const,
      exerciseDuration: "FORTYFIVE_TO_SIXTY" as const,
      stepsGoal: 10000,
      waterIntakeGoal: 10,
      exerciseMinutesGoal: 45,
      teamId: teams[2].id,
    },
    {
      name: "Lisa Wang",
      email: "lisa.wang@email.com",
      age: 29,
      gender: "FEMALE" as const,
      heightCm: 168,
      goalType: "WEIGHT_LOSS" as const,
      startWeight: 72,
      targetWeight: 62,
      currentWeight: 68,
      targetCalories: 1500,
      proteinTarget: 113,
      proteinPercentage: 30,
      carbsTarget: 150,
      carbsPercentage: 40,
      fatsTarget: 50,
      fatsPercentage: 30,
      exerciseFrequency: "FOUR_PLUS" as const,
      exerciseIntensity: "INTENSE" as const,
      exerciseDuration: "FORTYFIVE_TO_SIXTY" as const,
      stepsGoal: 12000,
      waterIntakeGoal: 10,
      exerciseMinutesGoal: 60,
      teamId: teams[0].id,
    },
    {
      name: "Tom Brown",
      email: "tom.brown@email.com",
      age: 42,
      gender: "MALE" as const,
      heightCm: 175,
      goalType: "WEIGHT_LOSS" as const,
      startWeight: 95,
      targetWeight: 80,
      currentWeight: 88,
      targetCalories: 1800,
      proteinTarget: 135,
      proteinPercentage: 30,
      carbsTarget: 180,
      carbsPercentage: 40,
      fatsTarget: 60,
      fatsPercentage: 30,
      exerciseFrequency: "TWO" as const,
      exerciseIntensity: "MODERATE" as const,
      exerciseDuration: "THIRTY_TO_FORTYFIVE" as const,
      stepsGoal: 8000,
      waterIntakeGoal: 8,
      exerciseMinutesGoal: 30,
      teamId: teams[0].id,
    },
    {
      name: "Jennifer Lopez",
      email: "jennifer.lopez@email.com",
      age: 38,
      gender: "FEMALE" as const,
      heightCm: 163,
      goalType: "WEIGHT_GAIN" as const,
      startWeight: 52,
      targetWeight: 58,
      currentWeight: 55,
      targetCalories: 2200,
      proteinTarget: 110,
      proteinPercentage: 20,
      carbsTarget: 330,
      carbsPercentage: 60,
      fatsTarget: 49,
      fatsPercentage: 20,
      exerciseFrequency: "THREE" as const,
      exerciseIntensity: "MODERATE" as const,
      exerciseDuration: "THIRTY_TO_FORTYFIVE" as const,
      stepsGoal: 8000,
      waterIntakeGoal: 8,
      exerciseMinutesGoal: 40,
      teamId: teams[1].id,
    },
    {
      name: "Ryan Miller",
      email: "ryan.miller@email.com",
      age: 25,
      gender: "MALE" as const,
      heightCm: 185,
      goalType: "WEIGHT_GAIN" as const,
      startWeight: 75,
      targetWeight: 88,
      currentWeight: 80,
      targetCalories: 3200,
      proteinTarget: 200,
      proteinPercentage: 25,
      carbsTarget: 400,
      carbsPercentage: 50,
      fatsTarget: 89,
      fatsPercentage: 25,
      exerciseFrequency: "FOUR_PLUS" as const,
      exerciseIntensity: "INTENSE" as const,
      exerciseDuration: "SIXTY_PLUS" as const,
      stepsGoal: 6000,
      waterIntakeGoal: 12,
      exerciseMinutesGoal: 75,
      teamId: teams[1].id,
    },
  ];

  // Create clients - always set lastActivityAt to today so they show activity
  const clients = await Promise.all(
    clientsData.map((data) =>
      prisma.client.create({
        data: {
          ...data,
          coachId: coach.id,
          lastActivityAt: new Date(), // Always today so "activity logged today" shows
          lastWeighInDate: subDays(new Date(), Math.floor(Math.random() * 3)),
          lastWeighInAmount: data.currentWeight,
        },
      })
    )
  );

  console.log(`✅ Created ${clients.length} clients`);

  // Create licenses for clients
  await Promise.all(
    clients.map((client) =>
      prisma.clientLicense.create({
        data: {
          coachId: coach.id,
          clientId: client.id,
          status: "ACTIVE",
          invitedEmail: client.email,
          invitedName: client.name,
          inviteLink: `https://app.cratox.ai/invite/${Math.random().toString(36).substring(7)}`,
          inviteSentAt: subDays(new Date(), 30),
          activatedAt: subDays(new Date(), 25),
          expiresAt: addDays(new Date(), 335), // ~11 months remaining
        },
      })
    )
  );

  // Create 2 pending licenses
  await Promise.all([
    prisma.clientLicense.create({
      data: {
        coachId: coach.id,
        status: "PENDING",
        invitedEmail: "newclient1@email.com",
        invitedName: "John Doe",
        inviteLink: `https://app.cratox.ai/invite/${Math.random().toString(36).substring(7)}`,
        inviteSentAt: subDays(new Date(), 2),
      },
    }),
    prisma.clientLicense.create({
      data: {
        coachId: coach.id,
        status: "PENDING",
        invitedEmail: "newclient2@email.com",
        invitedName: "Jane Smith",
        inviteLink: `https://app.cratox.ai/invite/${Math.random().toString(36).substring(7)}`,
        inviteSentAt: subDays(new Date(), 1),
      },
    }),
  ]);

  console.log("✅ Created licenses");

  // Create weight logs and daily logs for each client
  for (const client of clients) {
    const clientData = clientsData.find((c) => c.email === client.email)!;
    
    // Create weight logs - every 2 weeks (realistic user behavior)
    // Generate for full year to support 1Y chart view
    const weightLogs = [];
    let weight = clientData.startWeight;
    const biWeeklyWeightChange =
      clientData.goalType === "WEIGHT_LOSS"
        ? -0.3 // Lose ~0.3kg per 2 weeks (slower for realism over a year)
        : clientData.goalType === "WEIGHT_GAIN"
        ? 0.25 // Gain ~0.25kg per 2 weeks
        : 0;

    // Log weight every 14 days for the past year (roughly 26 entries)
    // Some randomness in logging frequency - sometimes skip a weigh-in
    for (let i = 364; i >= 0; i -= 14) {
      // 20% chance to skip a weigh-in (realistic user behavior)
      if (Math.random() > 0.2) {
        weight += biWeeklyWeightChange + (Math.random() - 0.5) * 0.5;
        // Clamp weight to reasonable bounds
        weight = Math.max(weight, clientData.targetWeight - 5);
        weight = Math.min(weight, clientData.startWeight + 5);
        weightLogs.push({
          clientId: client.id,
          weight: Math.round(weight * 10) / 10,
          date: subDays(new Date(), i),
        });
      }
    }

    await prisma.weightLog.createMany({ data: weightLogs });

    // Create daily logs for the past 14 days
    const dailyLogs = [];
    for (let i = 13; i >= 0; i--) {
      const variation = () => 0.8 + Math.random() * 0.4; // 80-120% of target
      
      // Detailed breakfast with ingredients and health score (like the mobile app)
      const breakfast = {
        healthScore: 7, // 1-10 scale
        foods: [
          { 
            name: "Wholewheat toast with jam and blueberries", 
            calories: 227, 
            protein: 8, 
            carbs: 45, 
            fats: 2, 
            fiber: 4, 
            sugars: 20,
            weight: 130,
            ingredients: [
              { name: "Whole wheat bread", calories: 148, protein: 8, carbs: 25, fats: 2, weight: 60 },
              { name: "Strawberry jam", calories: 50, protein: 0, carbs: 13, fats: 0, weight: 20 },
              { name: "Blueberries", calories: 29, protein: 1, carbs: 7, fats: 0, weight: 50 },
            ]
          },
        ]
      };
      
      // Detailed lunch with ingredients and health score
      const lunch = {
        healthScore: 8,
        foods: [
          { 
            name: "Pasta Bolognese", 
            calories: 610, 
            protein: 36, 
            carbs: 65, 
            fats: 20, 
            fiber: 5, 
            sugars: 8,
            weight: 350,
            ingredients: [
              { name: "Spaghetti pasta", calories: 280, protein: 10, carbs: 55, fats: 2, weight: 150 },
              { name: "Ground beef", calories: 250, protein: 22, carbs: 0, fats: 18, weight: 100 },
              { name: "Tomato sauce", calories: 50, protein: 2, carbs: 8, fats: 0, weight: 80 },
              { name: "Parmesan cheese", calories: 30, protein: 2, carbs: 2, fats: 0, weight: 20 },
            ]
          },
        ]
      };
      
      // Detailed dinner with ingredients and health score
      const dinner = {
        healthScore: 9, // High protein, vegetables = great score
        foods: [
          { 
            name: "Grilled Salmon with Vegetables", 
            calories: 520, 
            protein: 42, 
            carbs: 18, 
            fats: 32, 
            fiber: 6, 
            sugars: 5,
            weight: 320,
            ingredients: [
              { name: "Atlantic salmon fillet", calories: 350, protein: 35, carbs: 0, fats: 22, weight: 150 },
              { name: "Roasted broccoli", calories: 55, protein: 4, carbs: 10, fats: 1, weight: 100 },
              { name: "Sweet potato", calories: 90, protein: 2, carbs: 20, fats: 0, weight: 80 },
              { name: "Olive oil", calories: 40, protein: 0, carbs: 0, fats: 5, weight: 5 },
              { name: "Lemon", calories: 5, protein: 0, carbs: 2, fats: 0, weight: 15 },
            ]
          },
          { 
            name: "Mixed Green Salad", 
            calories: 85, 
            protein: 3, 
            carbs: 8, 
            fats: 5, 
            fiber: 3, 
            sugars: 3,
            weight: 120,
            ingredients: [
              { name: "Mixed greens", calories: 15, protein: 1, carbs: 3, fats: 0, weight: 60 },
              { name: "Cherry tomatoes", calories: 20, protein: 1, carbs: 4, fats: 0, weight: 40 },
              { name: "Balsamic vinaigrette", calories: 50, protein: 0, carbs: 2, fats: 5, weight: 20 },
            ]
          },
        ]
      };
      
      // Detailed snacks with health score
      const snacks = {
        healthScore: 8,
        foods: [
          { 
            name: "Greek Yogurt with Honey", 
            calories: 180, 
            protein: 15, 
            carbs: 20, 
            fats: 5, 
            fiber: 0, 
            sugars: 18,
            weight: 170,
            ingredients: [
              { name: "Greek yogurt", calories: 130, protein: 15, carbs: 8, fats: 5, weight: 150 },
              { name: "Honey", calories: 50, protein: 0, carbs: 12, fats: 0, weight: 20 },
            ]
          },
          { 
            name: "Apple with Almond Butter", 
            calories: 250, 
            protein: 6, 
            carbs: 30, 
            fats: 14, 
            fiber: 5, 
            sugars: 22,
            weight: 200,
            ingredients: [
              { name: "Apple", calories: 95, protein: 0, carbs: 25, fats: 0, weight: 180 },
              { name: "Almond butter", calories: 155, protein: 6, carbs: 5, fats: 14, weight: 20 },
            ]
          },
        ]
      };

      const totalCalories = Math.round(clientData.targetCalories * variation());
      const totalProtein = Math.round(clientData.proteinTarget * variation());
      const totalCarbs = Math.round(clientData.carbsTarget * variation());
      const totalFats = Math.round(clientData.fatsTarget * variation());

      dailyLogs.push({
        clientId: client.id,
        date: subDays(new Date(), i),
        breakfast,
        lunch,
        dinner,
        snacks,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFats,
        totalFiber: Math.round(25 * variation()),
        totalSaturatedFat: Math.round(15 * variation()),
        totalUnsaturatedFat: Math.round(totalFats * 0.6),
        totalSugars: Math.round(40 * variation()),
        totalSodium: Math.round(2000 * variation()),
        totalCaffeine: Math.round(150 * variation()),
        totalAlcohol: Math.random() > 0.8 ? Math.round(14 * Math.random()) : 0,
        waterIntake: Math.round(clientData.waterIntakeGoal * variation()),
        steps: Math.round(clientData.stepsGoal * variation()),
        exerciseMinutes: Math.round(clientData.exerciseMinutesGoal * variation()),
      });
    }

    await prisma.dailyLog.createMany({ data: dailyLogs });

    // Create exercises for the past 7 days - always include today
    const exercises = [];
    const exerciseTypes = [
      { name: "Running", type: "cardio", calories: 400 },
      { name: "Weight Training", type: "strength", calories: 300 },
      { name: "Cycling", type: "cardio", calories: 350 },
      { name: "Swimming", type: "cardio", calories: 450 },
      { name: "Yoga", type: "flexibility", calories: 150 },
      { name: "HIIT Workout", type: "cardio", calories: 500 },
    ];

    for (let i = 6; i >= 0; i--) {
      // Always include today (i=0) and random for other days
      if (i === 0 || Math.random() > 0.3) {
        const exercise = exerciseTypes[Math.floor(Math.random() * exerciseTypes.length)];
        exercises.push({
          clientId: client.id,
          name: exercise.name,
          type: exercise.type,
          duration: 30 + Math.floor(Math.random() * 45),
          caloriesBurned: Math.round(exercise.calories * (0.8 + Math.random() * 0.4)),
          source: Math.random() > 0.5 ? "APPLE_HEALTH" as const : "MANUAL" as const,
          date: subDays(new Date(), i),
        });
      }
    }

    if (exercises.length > 0) {
      await prisma.exercise.createMany({ data: exercises });
    }
  }

  console.log("✅ Created weight logs, daily logs, and exercises");

  // Create packages
  const packages = await Promise.all([
    prisma.package.create({
      data: {
        coachId: coach.id,
        name: "Single Session",
        description: "One-on-one coaching session",
        price: 75,
        sessions: 1,
        validityDays: 30,
        features: ["60-minute session", "Personalized feedback", "Follow-up notes"],
      },
    }),
    prisma.package.create({
      data: {
        coachId: coach.id,
        name: "Starter Package",
        description: "Perfect for getting started",
        price: 250,
        sessions: 4,
        validityDays: 60,
        features: ["4 coaching sessions", "Custom meal plan", "Weekly check-ins", "Email support"],
      },
    }),
    prisma.package.create({
      data: {
        coachId: coach.id,
        name: "Transformation Package",
        description: "Complete 12-week transformation",
        price: 750,
        sessions: 12,
        validityDays: 90,
        features: [
          "12 coaching sessions",
          "Custom meal plan",
          "Workout program",
          "Weekly check-ins",
          "24/7 messaging support",
          "Progress tracking",
        ],
      },
    }),
  ]);

  console.log("✅ Created packages");

  // Create bookings
  const bookings = [];
  for (let i = 0; i < 10; i++) {
    const client = clients[Math.floor(Math.random() * clients.length)];
    const daysOffset = Math.floor(Math.random() * 14) - 7; // -7 to +7 days
    const hour = 9 + Math.floor(Math.random() * 9); // 9 AM to 5 PM
    
    bookings.push({
      coachId: coach.id,
      clientId: client.id,
      packageId: packages[Math.floor(Math.random() * packages.length)].id,
      type: Math.random() > 0.5 ? "ONE_ON_ONE" as const : "ONLINE" as const,
      status: daysOffset < 0 ? "COMPLETED" as const : "SCHEDULED" as const,
      dateTime: addDays(new Date().setHours(hour, 0, 0, 0), daysOffset),
      duration: 60,
      title: "Coaching Session",
      price: 75,
      paymentStatus: daysOffset < 0 ? "PAID" as const : "PENDING" as const,
    });
  }

  await prisma.booking.createMany({ data: bookings });
  console.log("✅ Created bookings");

  // Create workouts
  const workouts = await Promise.all([
    prisma.workout.create({
      data: {
        coachId: coach.id,
        title: "Full Body Strength",
        description: "Complete full body workout for building strength",
        category: "strength",
        difficulty: "intermediate",
        duration: 45,
        content: [
          { name: "Squats", sets: 4, reps: 10, weight: 0, restTime: 90 },
          { name: "Bench Press", sets: 4, reps: 8, weight: 0, restTime: 90 },
          { name: "Deadlifts", sets: 3, reps: 8, weight: 0, restTime: 120 },
          { name: "Rows", sets: 3, reps: 10, weight: 0, restTime: 60 },
          { name: "Shoulder Press", sets: 3, reps: 10, weight: 0, restTime: 60 },
        ],
      },
    }),
    prisma.workout.create({
      data: {
        coachId: coach.id,
        title: "HIIT Cardio Blast",
        description: "High-intensity interval training for fat burning",
        category: "cardio",
        difficulty: "advanced",
        duration: 30,
        content: [
          { name: "Jumping Jacks", duration: 45, restTime: 15 },
          { name: "Burpees", duration: 45, restTime: 15 },
          { name: "Mountain Climbers", duration: 45, restTime: 15 },
          { name: "High Knees", duration: 45, restTime: 15 },
          { name: "Box Jumps", duration: 45, restTime: 15 },
        ],
      },
    }),
    prisma.workout.create({
      data: {
        coachId: coach.id,
        title: "Beginner Yoga Flow",
        description: "Gentle yoga routine for beginners",
        category: "flexibility",
        difficulty: "beginner",
        duration: 30,
        content: [
          { name: "Child's Pose", duration: 60 },
          { name: "Cat-Cow Stretch", duration: 60 },
          { name: "Downward Dog", duration: 45 },
          { name: "Warrior I", duration: 30 },
          { name: "Warrior II", duration: 30 },
          { name: "Savasana", duration: 120 },
        ],
      },
    }),
  ]);

  console.log("✅ Created workouts");

  // Create recipes
  const recipes = await Promise.all([
    prisma.recipe.create({
      data: {
        coachId: coach.id,
        title: "High Protein Breakfast Bowl",
        description: "Start your day with this protein-packed breakfast",
        category: "breakfast",
        calories: 450,
        protein: 35,
        carbs: 45,
        fats: 15,
        fiber: 8,
        prepTime: 10,
        cookTime: 5,
        servings: 1,
        ingredients: [
          { name: "Greek Yogurt", amount: 200, unit: "g" },
          { name: "Oats", amount: 50, unit: "g" },
          { name: "Berries", amount: 100, unit: "g" },
          { name: "Honey", amount: 1, unit: "tbsp" },
          { name: "Protein Powder", amount: 1, unit: "scoop" },
        ],
        instructions: [
          "Add Greek yogurt to a bowl",
          "Mix in protein powder until smooth",
          "Top with oats and berries",
          "Drizzle with honey",
          "Enjoy immediately",
        ],
      },
    }),
    prisma.recipe.create({
      data: {
        coachId: coach.id,
        title: "Grilled Chicken Salad",
        description: "Light and nutritious lunch option",
        category: "lunch",
        calories: 380,
        protein: 40,
        carbs: 15,
        fats: 18,
        fiber: 5,
        prepTime: 15,
        cookTime: 15,
        servings: 1,
        ingredients: [
          { name: "Chicken Breast", amount: 150, unit: "g" },
          { name: "Mixed Greens", amount: 100, unit: "g" },
          { name: "Cherry Tomatoes", amount: 50, unit: "g" },
          { name: "Cucumber", amount: 50, unit: "g" },
          { name: "Olive Oil", amount: 1, unit: "tbsp" },
          { name: "Lemon Juice", amount: 1, unit: "tbsp" },
        ],
        instructions: [
          "Season chicken breast with salt and pepper",
          "Grill chicken for 6-7 minutes per side",
          "Let chicken rest, then slice",
          "Assemble salad with greens and vegetables",
          "Top with sliced chicken",
          "Dress with olive oil and lemon juice",
        ],
      },
    }),
    prisma.recipe.create({
      data: {
        coachId: coach.id,
        title: "Salmon with Roasted Vegetables",
        description: "Omega-3 rich dinner for muscle recovery",
        category: "dinner",
        calories: 520,
        protein: 38,
        carbs: 25,
        fats: 30,
        fiber: 6,
        prepTime: 15,
        cookTime: 25,
        servings: 1,
        ingredients: [
          { name: "Salmon Fillet", amount: 170, unit: "g" },
          { name: "Broccoli", amount: 100, unit: "g" },
          { name: "Sweet Potato", amount: 100, unit: "g" },
          { name: "Olive Oil", amount: 1, unit: "tbsp" },
          { name: "Garlic", amount: 2, unit: "cloves" },
          { name: "Lemon", amount: 0.5, unit: "whole" },
        ],
        instructions: [
          "Preheat oven to 400°F (200°C)",
          "Cube sweet potato and toss with olive oil",
          "Roast sweet potato for 15 minutes",
          "Add broccoli to the pan, roast 10 more minutes",
          "Season salmon and bake for 12-15 minutes",
          "Serve salmon over vegetables with lemon",
        ],
      },
    }),
  ]);

  console.log("✅ Created recipes");

  // Create meal plans
  await prisma.mealPlan.create({
    data: {
      coachId: coach.id,
      title: "7-Day Weight Loss Plan",
      description: "Balanced meal plan for sustainable weight loss",
      duration: 7,
      goalType: "WEIGHT_LOSS",
      targetCalories: 1600,
      targetProtein: 120,
      targetCarbs: 160,
      targetFats: 53,
      content: [
        {
          day: 1,
          breakfast: "High Protein Breakfast Bowl",
          lunch: "Grilled Chicken Salad",
          dinner: "Salmon with Roasted Vegetables",
          snacks: ["Apple with Almond Butter", "Greek Yogurt"],
        },
        // ... more days
      ],
    },
  });

  console.log("✅ Created meal plans");

  // Create conversations and messages
  for (const client of clients.slice(0, 4)) {
    const conversation = await prisma.conversation.create({
      data: {
        coachId: coach.id,
        clientId: client.id,
        lastMessageAt: subDays(new Date(), Math.floor(Math.random() * 3)),
        unreadByCoach: Math.floor(Math.random() * 3),
      },
    });

    await prisma.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          senderId: client.id,
          senderType: "CLIENT",
          clientId: client.id,
          content: "Hi coach! I had a great workout today. Feeling stronger!",
          createdAt: subDays(new Date(), 2),
        },
        {
          conversationId: conversation.id,
          senderId: coach.id,
          senderType: "COACH",
          content: "That's fantastic! Keep up the great work. How's your nutrition been?",
          createdAt: subDays(new Date(), 2),
          readAt: subDays(new Date(), 2),
        },
        {
          conversationId: conversation.id,
          senderId: client.id,
          senderType: "CLIENT",
          clientId: client.id,
          content: "Pretty good! I've been hitting my protein goals most days.",
          createdAt: subDays(new Date(), 1),
        },
      ],
    });
  }

  console.log("✅ Created conversations and messages");

  // Create notification rules
  await Promise.all([
    prisma.notificationRule.create({
      data: {
        coachId: coach.id,
        name: "Inactivity Alert",
        triggerType: "INACTIVITY_DAYS",
        conditions: { days: 3 },
        channel: "BOTH",
        titleTemplate: "We miss you!",
        messageTemplate: "Hi {name}, we noticed you haven't logged in for a few days. Remember, consistency is key!",
        isActive: true,
      },
    }),
    prisma.notificationRule.create({
      data: {
        coachId: coach.id,
        name: "License Expiring Soon",
        triggerType: "LICENSE_EXPIRING_DAYS",
        conditions: { days: 30 },
        channel: "EMAIL",
        titleTemplate: "Your subscription is expiring soon",
        messageTemplate: "Hi {name}, your Cratox AI subscription will expire in {days} days. Renew now to continue your fitness journey!",
        isActive: true,
      },
    }),
    prisma.notificationRule.create({
      data: {
        coachId: coach.id,
        name: "Goal Achievement",
        triggerType: "GOAL_ACHIEVED",
        conditions: { targetType: "weekly_workout" },
        channel: "IN_APP",
        titleTemplate: "Congratulations!",
        messageTemplate: "Amazing work, {name}! You've hit your weekly workout goal. Keep crushing it!",
        isActive: true,
      },
    }),
    prisma.notificationRule.create({
      data: {
        coachId: coach.id,
        name: "Missed Targets Alert",
        triggerType: "MISSED_TARGET_STREAK",
        conditions: { days: 3 },
        channel: "BOTH",
        titleTemplate: "Let's get back on track!",
        messageTemplate: "Hi {name}, we noticed you've missed your daily targets for {days} days. Don't worry—every day is a fresh start. Let's refocus and crush it!",
        isActive: true,
      },
    }),
    prisma.notificationRule.create({
      data: {
        coachId: coach.id,
        name: "Weight Milestone",
        triggerType: "WEIGHT_MILESTONE",
        conditions: { milestoneType: "goal_reached" },
        channel: "BOTH",
        titleTemplate: "Amazing milestone reached! 🎉",
        messageTemplate: "Incredible work, {name}! You've reached a significant weight milestone. Your dedication is truly inspiring—keep going!",
        isActive: true,
      },
    }),
  ]);

  console.log("✅ Created notification rules");

  // Create sample notifications
  await Promise.all(
    clients.slice(0, 3).map((client) =>
      prisma.notification.create({
        data: {
          coachId: coach.id,
          clientId: client.id,
          type: "KUDOS",
          channel: "BOTH",
          title: "Great progress!",
          message: `Keep up the amazing work, ${client.name}! You're making excellent progress toward your goals.`,
          sentAt: subDays(new Date(), Math.floor(Math.random() * 7)),
        },
      })
    )
  );

  console.log("✅ Created notifications");

  // Create AI conversation
  await prisma.aIConversation.create({
    data: {
      coachId: coach.id,
      title: "Client Analysis",
      messages: [
        {
          role: "user",
          content: "Which clients are struggling this week?",
          timestamp: subDays(new Date(), 1).toISOString(),
        },
        {
          role: "assistant",
          content: "Based on my analysis of your clients' data, here are some observations:\n\n**Clients needing attention:**\n1. **Sarah Johnson** - Has missed protein targets 4 out of the last 7 days.\n2. **Mike Chen** - Hasn't logged any activity in 5 days.\n3. **Emma Williams** - Weight has plateaued for 2 weeks.\n\nWould you like me to draft notifications for any of these clients?",
          timestamp: subDays(new Date(), 1).toISOString(),
        },
      ],
    },
  });

  console.log("✅ Created AI conversation");

  // Create reports
  await Promise.all([
    prisma.report.create({
      data: {
        coachId: coach.id,
        name: "Weekly Client Progress",
        type: "CLIENT_PROGRESS",
        filters: { dateRange: "7d" },
        columns: ["name", "progress", "lastActivity", "compliance"],
        scheduleFrequency: "WEEKLY",
        scheduleDay: 1, // Monday
        scheduleTime: "09:00",
        emailDelivery: true,
      },
    }),
    prisma.report.create({
      data: {
        coachId: coach.id,
        name: "Monthly Revenue",
        type: "REVENUE",
        filters: { dateRange: "30d" },
        columns: ["date", "client", "amount", "status"],
        scheduleFrequency: "MONTHLY",
        scheduleDay: 1,
        scheduleTime: "09:00",
        emailDelivery: true,
      },
    }),
  ]);

  console.log("✅ Created reports");

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📧 Demo login credentials:");
  console.log("   Email: demo@cratox.ai");
  console.log("   Password: demo123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
