# DreamDoor

## Problem
Browsing homes online is stressful, transactional, and optimized for buying decisions instead of exploration and discovery.

## Solution
DreamDoor is a mobile app that lets users swipe through homes for fun or inspiration, without the pressure of buying.

## MVP Scope
This project intentionally has a narrow scope.

**Included**
- Swipe through homes
- View home image
- View price
- View beds and baths
- Save favorites locally

**Explicitly Excluded**
- User authentication
- Real MLS data
- Payments
- AI recommendations
- Map view
- Agent contact
- Anything not listed above

If it’s not listed, it does not exist in the MVP.

## Tech Stack
- **Frontend:** React Native
- **Backend:** Django + Django REST Framework
- **Database:** Postgres
- **Hosting (later):** AWS EC2
- **Data:** Static JSON seeded into the database

## Data Model (Initial)
**House**
- id
- address
- price
- beds
- baths
- sqft
- images[]

**Favorite**
- id
- house_id
- device_id (temporary)

No premature optimization. No normalization beyond necessity.

## 7-Day Build Plan
**Day 1:** Scope, repo setup, environment prep  
**Day 2:** Django models, seed fake data, `/houses` endpoint  
**Day 3:** React Native UI, swipe cards  
**Day 4:** Display home details (price, beds, baths)  
**Day 5:** Favorites (local / device-based)  
**Day 6:** Polish UI, edge cases  
**Day 7:** Cleanup, documentation, demo-ready build  

## Status
🚧 Early MVP — active development.

This project is intentionally focused on execution speed and learning.
