# StayLens — Entity-Relationship Diagram

The normalized catalog is built from the **primary** dataset (MongoDB Sample
Airbnb). The Kaggle dataset lives isolated in the `analytics` schema and is
therefore **not** shown as a relation here (no FKs cross into it, by design).

```mermaid
erDiagram
    auth_users ||--|| profiles : "1:1 (id)"

    profiles ||--o{ favorites      : "favorites"
    profiles ||--o{ bookmarks      : "bookmarks"
    profiles ||--o{ chat_sessions  : "owns"
    profiles ||--o{ bookings       : "books"
    profiles ||--o{ reviews        : "authors (future)"

    cities   ||--o{ properties        : "located in"
    hosts    ||--o{ properties        : "hosts"
    properties ||--o{ property_images : "gallery"
    properties ||--o{ reviews         : "has"
    properties ||--o{ favorites       : "favorited in"
    properties ||--o{ bookmarks       : "bookmarked in"
    properties ||--o{ bookings        : "reserved via"
    properties ||--|| embeddings      : "1:1 vector"
    properties }o--o{ amenities       : "via property_amenities"

    properties ||--o{ property_amenities : ""
    amenities  ||--o{ property_amenities : ""

    chat_sessions ||--o{ chat_messages : "turns"

    profiles {
        uuid id PK "= auth.users.id"
        text username UK
        text full_name
        char home_currency
    }
    cities {
        uuid id PK
        text city_name "UK with country"
        text state
        text country
        text continent
        text timezone
        char currency
    }
    hosts {
        uuid id PK
        text source_host_id "UK per source"
        text name
        bool is_superhost
        text_array verifications
    }
    properties {
        uuid id PK
        text source_id "UK per source"
        uuid host_id FK
        text name
        room_type_enum room_type
        numeric price
        double latitude
        double longitude
        int number_of_reviews
    }
    property_images {
        uuid id PK
        uuid property_id FK
        text url
        bool is_primary
        smallint sort_order
    }
    amenities {
        uuid id PK
        text name UK
        text slug UK
    }
    property_amenities {
        uuid property_id PK,FK
        uuid amenity_id PK,FK
    }
    reviews {
        uuid id PK
        uuid property_id FK
        date review_date
        text comments
    }
    favorites {
        uuid id PK
        uuid user_id FK
        uuid property_id FK
    }
    bookmarks {
        uuid id PK
        uuid user_id FK
        uuid property_id FK
        text collection
    }
    embeddings {
        uuid id PK
        uuid property_id FK,UK
        vector embedding "1536"
        text model
    }
    chat_sessions {
        uuid id PK
        uuid user_id FK
        text title
    }
    chat_messages {
        uuid id PK
        uuid session_id FK
        text role
        text content
    }
    bookings {
        uuid id PK
        uuid property_id FK
        uuid guest_id FK
        date check_in
        date check_out
        booking_status_enum status
    }
```

## Relationship summary

| Parent | Child | Cardinality | On delete |
|---|---|---|---|
| `auth.users` | `profiles` | 1 : 1 | cascade |
| `cities` | `properties` | 1 : N | set null |
| `hosts` | `properties` | 1 : N | set null |
| `properties` | `property_images` | 1 : N | cascade |
| `properties` | `reviews` | 1 : N | cascade |
| `properties` | `embeddings` | 1 : 1 | cascade |
| `properties` ↔ `amenities` | `property_amenities` | M : N | cascade |
| `profiles` | `favorites` / `bookmarks` | 1 : N | cascade |
| `profiles` | `chat_sessions` → `chat_messages` | 1 : N : N | cascade |
| `profiles` / `properties` | `bookings` | 1 : N | restrict |
