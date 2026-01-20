
import { ExecArgs } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';

export default async function debugTax({ container }: ExecArgs) {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    console.log("Querying Regions...");
    const { data: regions } = await query.graph({
        entity: "region",
        fields: ["id", "name", "currency_code", "payment_providers.*"]
    });
    console.log("Regions:", JSON.stringify(regions, null, 2));

    console.log("Querying Tax Regions...");
    try {
        const { data: taxRegions } = await query.graph({
            entity: "tax_region",
            fields: ["id", "country_code", "provider_id"]
        });
        console.log("Tax Regions:", JSON.stringify(taxRegions, null, 2));
    } catch (e) {
        console.error("Error querying tax regions:", e.message);
    }
}
