import { getProducts, getSubscription } from "@/lib/supabase/db";
import Pricing from "./pricing-client";

export default async function Page() {
    const [{ subscription, user }, products] = await Promise.all([getSubscription(), getProducts()])

    return (
        <Pricing user={user} products={products} subscription={subscription} />
    )
} 