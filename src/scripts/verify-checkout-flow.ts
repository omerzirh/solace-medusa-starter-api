
import { ExecArgs } from '@medusajs/framework/types';
import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils';
import {
    createCartWorkflow,
    addToCartWorkflow,
    updateCartWorkflow,
    listShippingOptionsForCartWorkflow
} from '@medusajs/medusa/core-flows';

export default async function verifyCheckoutFlow({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const regionService = container.resolve(Modules.REGION);
    const productService = container.resolve(Modules.PRODUCT);
    const salesChannelService = container.resolve(Modules.SALES_CHANNEL);

    logger.info("---------------------------------------------------");
    logger.info("STARTING CHECKOUT VERIFICATION FLOW");
    logger.info("---------------------------------------------------");

    // 1. Setup Context
    const regions = await regionService.listRegions();
    const region = regions.find(r => r.name === 'Europe') || regions[0];
    logger.info(`Context: Using Region "${region.name}" (${region.id})`);

    const products = await productService.listProducts({}, { take: 1 });
    if (products.length === 0) {
        logger.error("No products found. Cannot verify.");
        return;
    }
    const product = products[0];
    const variant = product.variants ? product.variants[0] : null; // Medusa 2 structure might differ slightly, checking existence

    if (!variant) {
        // Fetch variants if not expanded
        const variants = await productService.listProductVariants({ product_id: product.id });
        if (variants.length === 0) {
            logger.error("Product has no variants.");
            return;
        }
        // @ts-ignore
        product.variants = variants;
    }

    // @ts-ignore
    const variantId = product.variants[0].id;
    logger.info(`Context: Using Product "${product.title}" (Variant: ${variantId})`);

    // 2. Create Cart
    logger.info("Step: Creating Cart...");
    const { result: cart } = await createCartWorkflow(container).run({
        input: {
            region_id: region.id,
            currency_code: region.currency_code,
        }
    });
    logger.info(`Cart created: ${cart.id}`);

    // 3. Add Item
    logger.info("Step: Adding Item...");
    await addToCartWorkflow(container).run({
        input: {
            cart_id: cart.id,
            items: [{
                variant_id: variantId,
                quantity: 1
            }]
        }
    });

    // 4. Update Address (Required for shipping options usually)
    logger.info("Step: Setting Shipping Address (Country: PL)...");
    await updateCartWorkflow(container).run({
        input: {
            id: cart.id,
            shipping_address: {
                address_1: "Test St 1",
                city: "Warsaw",
                country_code: "pl",
                postal_code: "00-001"
            }
        }
    });

    // 5. Fetch Shipping Options
    logger.info("Step: Listing Shipping Options...");
    try {
        const { result: options } = await listShippingOptionsForCartWorkflow(container).run({
            input: {
                cart_id: cart.id
            }
        });

        if (options.length > 0) {
            logger.info(`SUCCESS: Found ${options.length} valid shipping options.`);
            options.forEach(o => {
                logger.info(` - ${o.name} (Amount: ${o.amount})`);
            });
        } else {
            logger.error("FAILURE: No shipping options returned. The issue persists.");
        }
    } catch (error) {
        logger.error(`FAILURE: Error fetching shipping options: ${error.message}`);
        console.error(error);
    }

    logger.info("---------------------------------------------------");
}
