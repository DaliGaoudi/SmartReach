
import { getProducts, getSubscription } from "@/lib/supabase/db";
import Pricing from "./pricing-client";
import { redirect } from "next/navigation";

const isSoftLaunch = process.env.SOFT_LAUNCH === "true";

export default async function Page() {
    if (isSoftLaunch) {
        // During soft launch, redirect all users to the waitlist page
        redirect("/waitlist");
    }
    const [{ subscription, user }, products] = await Promise.all([getSubscription(), getProducts()]);
    return (
        <Pricing user={user} products={products} subscription={subscription} />
    );
}