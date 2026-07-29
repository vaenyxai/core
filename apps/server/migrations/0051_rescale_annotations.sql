-- Repair marks stored while the tool trusted the prompt's 0-1000 request
-- (Oskar, 2026-07-29): a model that answered in 0-100 had every dot divided by
-- ten, so whole photos' worth of marks collapsed into the top-left tenth of the
-- picture. The reader now works the scale out from the numbers; these rows were
-- written before it did. A row where NO coordinate reaches 10 is a photo whose
-- marks are all in that corner — nothing real looks like that — so it is the
-- shrunken kind and is multiplied back out.
UPDATE image_annotations
SET items = (
  SELECT json_group_array(
    json_object(
      'name', json_extract(entry.value, '$.name'),
      'x', round(json_extract(entry.value, '$.x') * 10, 1),
      'y', round(json_extract(entry.value, '$.y') * 10, 1)
    )
  )
  FROM json_each(image_annotations.items) AS entry
)
WHERE (
  SELECT MAX(coordinate)
  FROM (
    SELECT json_extract(value, '$.x') AS coordinate
    FROM json_each(image_annotations.items)
    UNION ALL
    SELECT json_extract(value, '$.y')
    FROM json_each(image_annotations.items)
  )
) <= 10;
