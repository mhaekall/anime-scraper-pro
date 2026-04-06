import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg", // Postgres
    }),
    advanced: {
        crossOrigin: true, // Allow different origins if necessary
    },
    trustedOrigins: [
        "http://localhost:3000",
        "https://anime-scraper-pro.pages.dev"
    ],
    socialProviders: {
       google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
       }
    },
});
