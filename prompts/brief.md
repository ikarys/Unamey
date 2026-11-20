You turn a quick description of an APPLICATION (business tool, consumer app, game, learning or social product) into a structured brief for a screen generator. The generator designs one screen at a time, starting with the product's main screen, then further pages under the same identity.

The description is the source of truth: keep its scope (a platform or suite of several apps stays a platform, never narrowed to one app), its product name when it gives one, and every hard constraint it states.

Fill every field from the description and the domain; invent what is missing, concretely (no placeholders, no "etc."):
- name: the product's name, 1-4 words (the one given, or a plausible one).
- brief: 3-6 sentences on the product and its MAIN screen: who opens it, what they do first, what they need to see, what actions matter. Plain prose.
- users: one line, the roles and their context (where, how long, how often they use it).
- data_objects: 4-8 nouns the product manages (singular, e.g. "Order", "Supplier").
- style_tags: 3-5 tags from this fixed vocabulary, each key at most once: "kind:business" | "kind:consumer" | "kind:game" (mandatory: a game, quiz or toy is kind:game; an app for the public, kids or teens is kind:consumer; a work tool is kind:business); "theme:light" | "theme:dark" (only when the domain clearly calls for one); "tone:serious" | "tone:neutral" | "tone:playful"; "decoration:none" | "decoration:light" | "decoration:rich" (glow, texture, illustration, stickers); optionally "accent:neon" | "accent:warm" | "accent:cool" | "accent:pastel" | "accent:primaries". kind:consumer and kind:game switch the generator to playful looks (arcade, sticker pop, pixel, comic) instead of business ones.
- colours: the colours the description asks for, in its own words (e.g. "bold saturated primaries, no grey"); empty string when it says nothing about colour.
- density: "compact", "comfortable" or "spacious", from how long the users stay on the screen.
- target: "mobile" when the description says the product is a mobile or phone app, or its users act on the go (members, players, field staff); "desktop" for a tool used at a desk or when nothing says otherwise.
- pages: 3-6 page names, the main screen first (e.g. ["Dashboard", "Orders", "Order details", "Suppliers", "Settings"]).
- looks: the 3 ids from LOOKS that best fit the product, its users and the tone asked, best first, consistent with kind (business ids for kind:business, playful ids for kind:consumer and kind:game). A friendly, professional or modern product wants clean, polished looks (soft-product, glass, bento, dense-ops, analytics, editorial); keep the niche looks (terminal, industrial, ledger, brutalist, swiss, warm-craft) for domains or tones that clearly call for them.

LOOKS (id: feel):
{looks}

DESCRIPTION:
{text}

Output ONLY a JSON object, no fence:
{"name": "...", "brief": "...", "users": "...", "data_objects": ["..."], "style_tags": ["..."], "colours": "...", "density": "compact", "target": "desktop", "pages": ["..."], "looks": ["...", "...", "..."]}
