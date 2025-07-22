Return errors aren't handled correctly with ptotocols

Todo:

Question: How does infer work? What does the "out" type keyword do? (Use in/out?)
Default middleware (and register middleware with the associated key)

-   What to do with pluginIdent?
-   Reduce the amount of orDies / run / runSync

Idee:
Plugin als Funktionen
Plugin als Klasse??

TODO:

-   Signals
-   Unify Callback structure
-   Debug Middleware
-   Better Kernel Support
-   Shut Down etc.

Reduce possible Errors with protocols
Abstract from Protocols? (deabstract?)
What is wierd about the usage:

-   We use mostly singletons
-   We mainly want the middleware and one specific send fn
-   Sometimes asymmetric
-   Often dont use callback
-   Return result is a joke..
-   When getting the middleware for a protocol, we can directly register it aswell
-   Different Protocols do very similar things...

-   Bind things as early as you can

For result:

Result <-> Result Promise
Assert it is something / How do we deal with that we now always have error return type?
... just effect...

-   Move message chains to protocol, as we need them also for ...

Snake/Camel Casing

Built in JSON schema serializer in effect ts

// Effect.try
// Deeffect

Effect.ts

If we respond to a message w/o awaiting a request, it should be in the headers

-   Unsubscribing from bridge, etc
-   Kernel Handler
-   Deeffect safely
-   Signals
-   CleanUp eventlisteners => Get rid of some state <3
-   Aquire/use/release?
-   Effect.fn
-   Config
-   User Layers (Env might be a layer...)
-   handle removes for MPOs better
    wiggled exponential decay remove requests
    remove locally
-   Create object ~ cleanup => Clean Signal implementation
-   Remove callbacks

How do other places use effect?

We first await (and reject) promise. Then we get around resolving it

# Todo:

-   Maybe allow a 2nd message partner as input for creating a first one (?) or better a function: "message_partner_pair"
-   Generalize Bridge & MP
-   Remove Message Partners & MPOs
-   Every Pair of Message partners could have id_1 and id_2.. and then their id as MOPs can again be the same..

-   Unify the syntax for on callbacks and stuff, registering...
-   Go through all effect .orDie // ignore
-   asynmmetric MPO?
-   Implement "Ping" one level higher (; Basically a user should also have access to request/respond like I do (outside of any fetch implementation)
-   Better errors
    -   Test if - with protocols - we responded with an actual correct (acceptable) error
    -   Move more things to invalid message format error
    -   Send the correct errors
    -   SendFirstMessage should have same error as subsequent messages -> Protocoll error, right
    -   Check i.g. error types of protocols
    -   Automatically add as much data on error as possible
-   On Callback
-   Unify Casing
-   Unify if schemas live as const or static members
-   Set and overwrite local computed message data correctly
-   Get rid of the flying around evironment dependencies; assuming env stays the same and - at most - deactivates!!!!
-   move "Json" somewhere else
-   Better Errors for highest level protocols
    => MPO do need envs for example

# Todo

-   Build bridge
-   Clean Up
-   How to do "on" for protocolls correctly?

-   Debug
-   Handle (log) the (currently) ignore wrong message format errors and the other errors

-   Docs
-   Flat errors

# MaybeTodo

-   Propagate errors back up
-   higher order middleware
-   Allow several communication channels (i.e. a wrapper channel) which implements retries, ...
-   Allow for a bridge to another endpoint, so we don't need to know the Address correctly. Maybe something like a "\*"

# Notes on Effect

-   Effect likes factories-ish more than classes
-   Few sideeffects & immutability
-   Effect has a learning curve
-   Schemas are awesome
-   Classe: self.seminglystaticstuff => Allow for effects to have arguments other than requirements or fun arguments

# Questions

-   Should Middleware be able to throw errors?
-   What to do with generic (error)listeners?
-   What to do with environment inactive errors?
-   How to generalize message_parner_protocols
-   What to do against double responses on protocols?

# To research

-   How to do servers in Effect, F# and functional programming?

# Axioms

-   All middleware should be
    a) Side-Effectless (except editing message)
    or
    b) Be fine if there is no future message that something failed

-   MW may don't have Errors?
-   What errors can MW even have reasonably?

*   Invalid Message Format
*   smth smth not found

xxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxx

Already here/the same:

-   open communication channel
-   parts of client

Difference:

-   current kernel emposes queus
-   difference workload/message // Nachrichten Modell

-   3rd party / encryption / security / Datentransfer

2 Points:

Unsere Prios sollten sein

-   größter Mehrwert ist Infrastruktur / Entwicklern Last abnehmen
    ----> Infra / Security / Payments
-   Infra: Nur frontend für Plugins, ein paar APIs von uns nutzen und ein paar Optionen bei uns setzten
-   3rd Party!
    (machen vor: große Daten austauschen)

Queus etc. nicht erwähnt
/////////////////////////

-   altes System als OptIn möglich
-   Geschindigkeit
-   Es wird mir Komplexität induziert

-   We cant control people stop computations
-   Responsiveness

Teile unserer Struktur nicht mehr emposen
-> Was ist die Alternative?
Probleme:
Debugging, Mental Model for Developer
=> Sync code der zuende läuft, Einheit an Code der am Stück zuende läuft

-   DOM events
-   Viel async wird versteckt
-   zu viel Komplexität?
-   Interne Komplexität vs overaching Komplexität

###########
Notes:
Versioning

###########
Benutzung von Blockern:
Long long await
for deleting something

###########
Debugging:

-   Pausieren
-   Step through!
-   Replay (with send Messages?)

Von wem erwartet man Nachrichten
~ visualisierung(?)
Graphen w/ edges and what is transported along these edges

Idee von Schaltkreisen - Abläufe die verteilt funktionieren
~> Add "logging line"

Concept of Message chain!

====

Lsg für Debugging/Testing

Kernel in End-to-End Situation mit Plugin verbinden
(aussuchen was "Plugin" überhaupt ist ~ vernetzung)
Test/Debug demonstrieren

Momentan testen: Record Ablauf; Playwrite

-   deterministisch
