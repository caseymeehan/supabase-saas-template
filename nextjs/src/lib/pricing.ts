export interface PricingTier {
    name: string;
    price: number;
    priceId: string;
    productId: string;
    description: string;
    features: string[];
    popular?: boolean;
}

class PricingService {
    private static tiers: PricingTier[] = [];

    static initialize() {
        const names = process.env.NEXT_PUBLIC_TIERS_NAMES?.split(',') || [];
        const prices = process.env.NEXT_PUBLIC_TIERS_PRICES?.split(',').map(Number) || [];
        const priceIds = process.env.NEXT_PUBLIC_TIERS_PRICEID?.split(',') || [];
        const productIds = process.env.NEXT_PUBLIC_TIERS_PRODUCTIDS?.split(',') || [];
        const descriptions = process.env.NEXT_PUBLIC_TIERS_DESCRIPTIONS?.split(',') || [];
        const features = process.env.NEXT_PUBLIC_TIERS_FEATURES?.split(',').map(f => f.split('|')) || [];
        const popularTier = process.env.NEXT_PUBLIC_POPULAR_TIER;

        this.tiers = names.map((name, index) => ({
            name,
            price: prices[index],
            priceId: priceIds[index],
            productId: productIds[index],
            description: descriptions[index],
            features: features[index] || [],
            popular: name === popularTier
        }));
    }

    static getAllTiers(): PricingTier[] {
        if (this.tiers.length === 0) {
            this.initialize();
        }
        return this.tiers;
    }

    static getCommonFeatures(): string[] {
        return process.env.NEXT_PUBLIC_COMMON_FEATURES?.split(',') || [];
    }

    static formatPrice(price: number): string {
        return `$${price}`;
    }

    static getTierByProductId(productId: string): PricingTier | undefined {
        return this.tiers.find(tier => tier.productId === productId);
    }
}

export default PricingService;