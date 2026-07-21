-- ============================================================================
-- StayLens · Phase 5 · Verification queries
-- ----------------------------------------------------------------------------
-- Run after import:  psql "$SUPABASE_DB_URL" -f sql/verification.sql
-- Each block should match the numbers in data_quality_report.md.
-- ============================================================================

\echo '== 1. Row counts (expect: properties 5555, hosts 5104, amenities 185, images 5555, links 120137, reviews 149792) =='
select 'properties'        as table, count(*) from properties
union all select 'hosts',              count(*) from hosts
union all select 'amenities',          count(*) from amenities
union all select 'property_images',    count(*) from property_images
union all select 'property_amenities', count(*) from property_amenities
union all select 'reviews',            count(*) from reviews
union all select 'kaggle_listings',    count(*) from analytics.kaggle_listings
order by 1;

\echo '== 2. Referential integrity (every count must be 0) =='
select 'orphan properties.host_id' as check, count(*) from properties p
    left join hosts h on h.id = p.host_id where p.host_id is not null and h.id is null
union all
select 'orphan images.property_id', count(*) from property_images i
    left join properties p on p.id = i.property_id where p.id is null
union all
select 'orphan reviews.property_id', count(*) from reviews r
    left join properties p on p.id = r.property_id where p.id is null
union all
select 'orphan link.property_id', count(*) from property_amenities pa
    left join properties p on p.id = pa.property_id where p.id is null
union all
select 'orphan link.amenity_id', count(*) from property_amenities pa
    left join amenities a on a.id = pa.amenity_id where a.id is null;

\echo '== 3. Constraint sanity (all must be 0) =='
select 'negative price'    as check, count(*) from properties where price < 0
union all select 'lat out of range',  count(*) from properties where latitude  not between -90 and 90
union all select 'lon out of range',  count(*) from properties where longitude not between -180 and 180
union all select 'max<min nights',    count(*) from properties
    where maximum_nights is not null and minimum_nights is not null and maximum_nights < minimum_nights;

\echo '== 4. Distributions — room type =='
select room_type, count(*), round(avg(price)::numeric, 2) as avg_price
from properties group by room_type order by 2 desc;

\echo '== 5. Top markets =='
select country, market, count(*) as listings
from properties group by country, market order by 3 desc limit 10;

\echo '== 6. Top amenities (join check) =='
select a.name, count(*) as listings
from property_amenities pa join amenities a on a.id = pa.amenity_id
group by a.name order by 2 desc limit 10;

\echo '== 7. Keyword full-text search demo: "beach view" =='
select id, name, city
from properties
where to_tsvector('english',
        coalesce(name,'')||' '||coalesce(summary,'')||' '||coalesce(space,'')||' '||
        coalesce(description,'')||' '||coalesce(neighborhood_overview,''))
      @@ websearch_to_tsquery('english', 'beach view')
limit 5;

\echo '== 8. Geo radius demo: listings within 3km of central Porto =='
select name, round(extensions.earth_distance(
        extensions.ll_to_earth(41.1413, -8.6131),
        extensions.ll_to_earth(latitude, longitude))::numeric) as meters
from properties
where extensions.earth_box(extensions.ll_to_earth(41.1413, -8.6131), 3000)
      @> extensions.ll_to_earth(latitude, longitude)
order by 2 limit 5;

\echo '== 9. Reviews per property (top reviewed) =='
select p.name, p.number_of_reviews, count(r.id) as loaded_reviews
from properties p left join reviews r on r.property_id = p.id
group by p.id, p.name, p.number_of_reviews
order by p.number_of_reviews desc limit 5;

\echo '== 10. Embeddings coverage (after Phase 6 embedding run) =='
select count(*) as embedded, (select count(*) from properties) as total
from embeddings;
