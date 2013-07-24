Choropleth map

Guidelines to create a Choropleth map template

- A map has unique identifier
- Must be placed on images/id.svg
- There must be a directory images/id with all flags inside it
- Each flag file must be on PNG format and named id.png
- SVG file format
- The svg element must have an id equals to the map identifier
- <g id="viewport"> and without scale, surrounding all other elements
- The map should fit exactly the page size, no missings
- No styles, fills or strokes
- Each region must have an id, used for mapping, a class "region" and a rel attribute with the region name

Great circles map
