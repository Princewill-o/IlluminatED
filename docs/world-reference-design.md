# City and home reference study

Original geometry; reference photos are not embedded in the game or used as textures.

- London terrace proportions, yellow stock brick, sash windows, mansard roof and iron railings: Historic England, Bedford Square listing: https://historicengland.org.uk/listing/the-list/list-entry/1272304
- Street image study: https://www.refreshrenovations.co.uk/articles/georgian-terrace-renovations
- Domestic material and layout study: IKEA UK natural-material living room, pine/oak furniture, linen upholstery, neutral colours: https://www.ikea.com/gb/en/rooms/living-room/gallery/a-living-room-made-with-natural-materials-pubbc91af31/

Rebuild with Blender: `blender --background --python art/blender/reference_realism.py`.
Exports live in `public/world3d/realism`, source scene in `art/blender/reference-realism.blend`, QA overview in `output/graphics/reference-realism.png`.
The new assets retain existing tile footprints, doors, collision routes and furniture placement. Decorative reference detail is deliberately simplified for browser performance.
