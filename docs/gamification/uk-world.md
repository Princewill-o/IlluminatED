# UK districts, roads and connected housing

`src/game/core/uk-world.ts` owns the deterministic playable region data and road graph. These are stylised game districts with compressed travel; they are not navigation directions or a street-for-street reconstruction. Coordinates in `UK_PLACES` are approximate real city centres for the UK atlas. Kent is labelled a county, with a Canterbury/Medway-inspired district rather than an invented city called Kent.

## Playable places

| Place      | District ground plan                                        | Housing                                                 |
| ---------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| London     | Existing Thames city preserved                              | Existing homes unchanged                                |
| Kent       | Orchard rows and a planted central walk                     | Smaller flint/weatherboard cottages, warm pitched roofs |
| Nottingham | Lace-workshop market court and a Sherwood-inspired grove    | Taller red-brick terraces                               |
| Birmingham | Narrow canal with a crossing and towpaths                   | Brick townhouses and canal courts                       |
| Manchester | Canal crossing at a different position, warehouse forecourt | Taller warehouse lofts and townhouses                   |
| Edinburgh  | Formal garden strips with a crossing axis                   | Sandstone tenements, slate roofs                        |

Each new district has 18 full-size houses and two public learning buildings. Each house has an enterable interior with real bed, desk, sofa, table, kitchen, fridge, shelf and plant furniture. Some plans are mirrored; materials follow the regional exterior. These are visitable game homes, not purchases or new entries in the player's owned inventory. Study and rest use the existing activities. Returning from a house places the player beside that house's front door.

## M25 driving scene

The motorway is a 360-by-72-tile scene, with a long straight dual carriageway, three lanes in each direction, wide hard shoulders, a solid central reservation and service buildings set away from the road. It deliberately unfolds the real orbital road into a long playable motorway segment; passing the end repeats the carriageway. It does not place other cities physically on the M25.

Eastbound lane centres are tile rows 28, 30 and 32; westbound centres are 40, 42 and 44. The reservation is rows 34–37, columns 24–335. Turn bays outside the signed central section let three independent traffic loops close without sending cars through the reservation. Player continuation across the end preserves lane and heading. Each regional exit has an interaction gate on both carriageways.

## Rotherhithe Tunnel

The A101 scene has a tunnel carriageway, a return circuit and accessible side paths. Entering through the north London portal arrives at the north end; the south entrance arrives at the south end. Leaving either end returns to the corresponding London approach. This preserves the physical route when travelling back.

## Repeating districts

`loopRoadPosition(mapId, x, y)` accepts pixel coordinates. It wraps only matched arterial exits, never parks, water, interior boundaries or arbitrary edges. It rejects non-finite and out-of-bounds input. Landing farther inside than the trigger avoids immediate repeated teleports. London has two matched east/west arterials; the new districts have two horizontal and two vertical matched roads. M25 wraps along either carriageway.

`ukArrival(mapId, fromMapId, viaPortalId?)` keeps house, junction and tunnel-end returns attached to their original approach. Integrators should still pass arrivals through the existing `safeSpot` or `nearestDrivingSpot` checks for the selected movement mode.

## Route research

Verified 2 November 2026. Routes represent credible connecting corridors; gameplay shortens the journey and does not use live closures, journey times or navigation feeds.

- London orbital to the north: M25 junction 21 connects to the M1 at junction 6A, documented in the [2011 highway order](https://www.legislation.gov.uk/uksi/2011/1600/pdfs/uksi_20111600_en.pdf).
- Kent: M25 junction 2 / A2 / M2 / A2, then A2050 into Canterbury. [Kent County Council's road list](https://www.kent.gov.uk/roads-and-travel/what-we-look-after/roads/types-of-roads) documents the motorway/trunk-road corridor; [Canterbury's transport modelling report](https://www.canterbury.gov.uk/sites/default/files/2024-04/Transport%20Modelling%20Preferred%20Strategic%20Growth%20Local%20Plan%20Option%20v5.pdf) identifies A2050 Rheims Way as the western city access from the A2.
- Nottingham: M1 junction 24 / A453 / A52, documented by [National Highways' A453 evaluation](https://nationalhighways.co.uk/media/vp3ffeob/a453-five-year-post-opening-project-evaluation.pdf).
- Birmingham: M1 / M6 at Catthorpe, then A38(M). The [Highways England junction announcement](https://www.gov.uk/government/news/major-midlands-junction-improvement-open) documents M1/M6/A14 junction 19; [Birmingham City Council](https://www.birmingham.gov.uk/info/50077/roadworks_and_transport_improvements/2633/a38m_aston_expressway_tame_valley_viaduct/) documents the A38(M) connection from the M6 to central Birmingham.
- Manchester: M6 / A556 / M56 / A5103. The [DfT road investment announcement](https://www.gov.uk/government/news/major-roads-investment-in-the-north-west) describes the A556 between the M6 and M56 as southern access to Manchester; [DfT count point 99833](https://roadtraffic.dft.gov.uk/count-points/99833) documents the M56/A5103 connection.
- Edinburgh: M25 junction 23 / A1 / A1(M) / A1. The [junction 23 highway order](https://www.legislation.gov.uk/uksi/2011/25/pdfs/uksi_20110025_en.pdf) names A1/A1(M); [Transport Scotland's A1 order](https://www.transport.gov.scot/road-order/the-north-east-north-west-and-south-east-scotland-no4-and-south-west-no3-trunk-roads-temporary-prohibitions-of-traffic-and-overtaking-and-temporary-speed-restrictions-order-2024/) identifies the Edinburgh–Berwick trunk road.
- Rotherhithe: [TfL's A101 Rotherhithe Tunnel order](https://foi.tfl.gov.uk/FOI-1666-2021/047%20Order%20-%20Rotherhite%20Tunnel%202019%20%28Latest%29.pdf) identifies the crossing between Tower Hamlets and Southwark. It is an inner-London crossing, not an M25 tunnel.

## Verification

`node --test tests/uk-world.test.mjs` checks reachable doors and interior exits for all 90 houses, reversible regional links, genuine distinct tile plans, full-size building collision footprints, continuous traffic lanes, finite safe wrapping, both tunnel endpoints and the motorway's three lanes per direction. `npm run typecheck` validates integration types. Renderer and browser checks are separate integration work.
