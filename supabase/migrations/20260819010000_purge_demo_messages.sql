-- Removes synthetic rows inserted by the (now-removed) "Load Demo Data" button,
-- which called seed-demo-messages and wrote fake messages into the real
-- messages table. Seeded rows are uniquely identifiable: seed-demo-messages
-- always set external_message_id to 'demo_<timestamp>_<index>', a format no
-- real inbound webhook message could ever produce.

delete from public.messages
where external_message_id like 'demo\_%' escape '\';
