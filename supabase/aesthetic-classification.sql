-- Optional operator notes for aesthetic classification.
-- Products remain kind='product' JSON payloads; styleClassification is stored on the payload.
-- Human retailer-image reviews use kind='style_label'.
-- No destructive migration. Safe to run after schema.sql.

-- Read-only view of classifier fields for ops (service_role).
create or replace view public.product_style_classification with (security_invoker=true) as
select id,
       payload->>'title' as title,
       payload->>'image' as image,
       payload->'styleClassification'->>'status' as status,
       payload->'styleClassification'->>'modelVersion' as model_version,
       payload->'styleClassification'->>'imageHash' as image_hash,
       payload->'styleClassification'->'ranked' as ranked,
       payload->'styleClassification'->>'classifiedAt' as classified_at,
       updated_at
from public.records
where kind='product';
revoke all on public.product_style_classification from anon, authenticated;
grant select on public.product_style_classification to service_role;

create or replace view public.style_labels with (security_invoker=true) as
select id,
       owner,
       payload->>'productId' as product_id,
       payload->>'style' as style,
       (payload->>'agreed')::boolean as agreed,
       payload->'predicted' as predicted,
       payload->>'modelVersion' as model_version,
       (payload->>'at')::timestamptz as labeled_at
from public.records
where kind='style_label';
revoke all on public.style_labels from anon, authenticated;
grant select on public.style_labels to service_role;
