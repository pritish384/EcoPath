-- Seed data for Ecopath

insert into public.products (name, description) values
  ('Smartphone', 'Consumer smartphone devices'),
  ('Plastic bottle', 'Single-use PET bottles'),
  ('EV battery', 'Lithium-ion batteries from EVs');

insert into public.regions (name, code) values
  ('India', 'IN'),
  ('European Union', 'EU'),
  ('United States', 'US'),
  ('SE Asia', 'SEA'),
  ('Africa', 'AF');

insert into public.pathways (name, category, description) values
  ('Formal Recycling', 'recycling', 'Regulated recycling infrastructure'),
  ('Informal Recovery', 'informal', 'Informal collection and recovery'),
  ('Resale/Refurb', 'reuse', 'Second-hand resale and refurbishment'),
  ('Landfill', 'disposal', 'Landfill or open dumping');

-- Smartphone · India
with product as (
  select id from public.products where name = 'Smartphone'
), region as (
  select id from public.regions where name = 'India'
), pathways as (
  select id, name from public.pathways
), inserted as (
  insert into public.pathway_probabilities (product_id, region_id, pathway_id, probability, confidence, source)
  select
    product.id,
    region.id,
    pathways.id,
    case pathways.name
      when 'Formal Recycling' then 38
      when 'Informal Recovery' then 22
      when 'Resale/Refurb' then 18
      when 'Landfill' then 22
      else 0
    end as probability,
    68 as confidence,
    'Seed estimate'
  from product, region, pathways
  returning id, pathway_id
)
insert into public.loss_hotspots (pathway_probability_id, label, description, severity)
select
  inserted.id,
  case pathways.name
    when 'Formal Recycling' then 'Sorting losses'
    when 'Informal Recovery' then 'Open burning'
    when 'Resale/Refurb' then 'Leakage'
    when 'Landfill' then 'No capture'
    else 'Unknown'
  end,
  'Seed description',
  'medium'
from inserted
join public.pathways pathways on pathways.id = inserted.pathway_id;

-- Plastic bottle · European Union
with product as (
  select id from public.products where name = 'Plastic bottle'
), region as (
  select id from public.regions where name = 'European Union'
), pathways as (
  select id, name from public.pathways
), inserted as (
  insert into public.pathway_probabilities (product_id, region_id, pathway_id, probability, confidence, source)
  select
    product.id,
    region.id,
    pathways.id,
    case pathways.name
      when 'Formal Recycling' then 55
      when 'Informal Recovery' then 5
      when 'Resale/Refurb' then 5
      when 'Landfill' then 35
      else 0
    end as probability,
    72 as confidence,
    'Seed estimate'
  from product, region, pathways
  returning id, pathway_id
)
insert into public.loss_hotspots (pathway_probability_id, label, description, severity)
select
  inserted.id,
  case pathways.name
    when 'Formal Recycling' then 'Contamination'
    when 'Informal Recovery' then 'Low collection'
    when 'Resale/Refurb' then 'No reuse market'
    when 'Landfill' then 'Residual waste'
    else 'Unknown'
  end,
  'Seed description',
  'low'
from inserted
join public.pathways pathways on pathways.id = inserted.pathway_id;

-- EV battery · United States
with product as (
  select id from public.products where name = 'EV battery'
), region as (
  select id from public.regions where name = 'United States'
), pathways as (
  select id, name from public.pathways
), inserted as (
  insert into public.pathway_probabilities (product_id, region_id, pathway_id, probability, confidence, source)
  select
    product.id,
    region.id,
    pathways.id,
    case pathways.name
      when 'Formal Recycling' then 42
      when 'Informal Recovery' then 3
      when 'Resale/Refurb' then 35
      when 'Landfill' then 20
      else 0
    end as probability,
    65 as confidence,
    'Seed estimate'
  from product, region, pathways
  returning id, pathway_id
)
insert into public.loss_hotspots (pathway_probability_id, label, description, severity)
select
  inserted.id,
  case pathways.name
    when 'Formal Recycling' then 'Capacity gap'
    when 'Informal Recovery' then 'Safety risk'
    when 'Resale/Refurb' then 'Storage delays'
    when 'Landfill' then 'Improper disposal'
    else 'Unknown'
  end,
  'Seed description',
  'medium'
from inserted
join public.pathways pathways on pathways.id = inserted.pathway_id;
