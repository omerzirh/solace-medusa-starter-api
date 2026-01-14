import { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { StoreSearchProductsParamsType } from './validators';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

export const GET = async (
  req: MedusaRequest<StoreSearchProductsParamsType>,
  res: MedusaResponse
) => {
  const { 
    q, 
    limit, 
    offset, 
    order, 
    collection_id,
    category_id,
    type_id,
    materials,
    min_price,
    max_price,
  } = req.validatedQuery;

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const filters: any = {};

  if (q) {
    filters.q = q;
  }

  if (collection_id) {
    filters.collection_id = collection_id;
  }

  if (category_id) {
    filters.categories = {
      id: category_id
    };
  }

  if (type_id) {
    filters.type_id = type_id;
  }

  if (materials) {
    filters.material = materials;
  }

  if (min_price !== undefined || max_price !== undefined) {
    filters.variants = {
      prices: {
        amount: {}
      }
    };

    if (min_price !== undefined) {
      filters.variants.prices.amount["$gte"] = min_price;
    }

    if (max_price !== undefined) {
      filters.variants.prices.amount["$lte"] = max_price;
    }
  }

  const { data: products, metadata } = await query.index({
    entity: 'product',
    fields: req.listConfig.select,
    filters,
    pagination: {
      skip: offset,
      take: limit,
      order: order === 'relevance' ? undefined : {
        [order.startsWith('-') ? order.slice(1) : order]: order.startsWith('-') ? 'DESC' : 'ASC'
      }
    }
  });

  res.json({
    products,
    count: metadata?.estimate_count ?? products.length,
    limit,
    offset
  });
};
