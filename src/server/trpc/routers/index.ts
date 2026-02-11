import { createTRPCRouter } from "../init";
import { clientRouter } from "./client";
import { licenseRouter } from "./license";
import { teamRouter } from "./team";
import { bookingRouter } from "./booking";
import { packageRouter } from "./package";
import { contentRouter } from "./content";
import { messageRouter } from "./message";
import { notificationRouter } from "./notification";
import { aiRouter } from "./ai";
import { recipeAiRouter } from "./recipe-ai";
import { reportRouter } from "./report";
import { settingsRouter } from "./settings";
import { dashboardRouter } from "./dashboard";

export const appRouter = createTRPCRouter({
  clients: clientRouter,
  license: licenseRouter,
  team: teamRouter,
  booking: bookingRouter,
  package: packageRouter,
  content: contentRouter,
  message: messageRouter,
  notification: notificationRouter,
  ai: aiRouter,
  recipeAi: recipeAiRouter,
  report: reportRouter,
  settings: settingsRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
