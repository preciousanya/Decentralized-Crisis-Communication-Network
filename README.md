# 🚨 Decentralized Crisis Communication Network

Welcome to a revolutionary Web3 solution for maintaining reliable communication during emergencies! This project leverages the Stacks blockchain and Clarity smart contracts to create decentralized, tamper-proof channels for sharing critical information when traditional networks fail—such as during natural disasters, blackouts, or crises. By decentralizing communication, it ensures accessibility, transparency, and resistance to censorship or infrastructure breakdowns.

## ✨ Features

🚨 Create and join emergency channels for specific events or regions  
📡 Broadcast verified alerts and updates in real-time  
🔒 Immutable message logs for accountability and auditing  
✅ User verification to prevent misinformation  
📍 Geo-tagged messages for location-based relevance  
🔔 Subscription system for instant notifications  
🛡️ Moderation tools with decentralized governance  
💰 Token incentives for reliable reporters and validators  
🔄 Integration with off-chain oracles for real-world data feeds  
📊 Analytics for post-crisis review and improvement

## 🛠 How It Works

This project is built using 8 Clarity smart contracts that interact to form a robust decentralized system. Each contract handles a specific aspect of the communication network, ensuring modularity, security, and scalability on the Stacks blockchain.

### Key Smart Contracts

1. **UserRegistry.clar**: Manages user registration and identity verification. Users submit proofs (e.g., hashed personal info) to create profiles, enabling trusted communication.  
2. **ChannelManager.clar**: Allows creation and management of emergency channels. Admins (e.g., authorities or community leaders) can define channels by event type, location, or urgency, with access controls.  
3. **MessageStorage.clar**: Stores messages immutably with timestamps, hashes, and sender info. Supports text, geo-data, and simple media references for crisis updates.  
4. **VerificationEngine.clar**: Verifies message authenticity using multi-signature or oracle integrations. Prevents spam by requiring sender reputation or token stakes.  
5. **AlertDispatcher.clar**: Handles broadcasting high-priority alerts to subscribers. Integrates with off-chain triggers (e.g., weather APIs via oracles) for automated warnings.  
6. **SubscriptionSystem.clar**: Manages user subscriptions to channels. Users can opt-in for notifications, with privacy-focused on-chain events for updates.  
7. **ModerationDAO.clar**: A decentralized autonomous organization (DAO) for content moderation. Token holders vote on disputes, flagging misinformation, or elevating critical posts.  
8. **IncentiveToken.clar**: An STX-based token contract for rewarding verified contributors (e.g., first responders sharing info) and penalizing bad actors through slashing.

### For Users (General Public)

- Register via the UserRegistry contract by calling `register-user` with your hashed identity.  
- Subscribe to relevant channels using SubscriptionSystem's `subscribe-to-channel`.  
- Post messages to a channel with MessageStorage's `submit-message`, including optional geo-tags.  
- Receive alerts through on-chain events monitored by dApps or wallets.

Boom! Stay informed even if centralized networks go down.

### For Authorities/Responders

- Create channels with ChannelManager's `create-channel` function, specifying parameters like region or crisis type.  
- Broadcast alerts using AlertDispatcher, which triggers notifications to subscribers.  
- Verify and moderate content via VerificationEngine and ModerationDAO to maintain trust.  
- Earn or distribute incentives through IncentiveToken for accurate reporting.

### For Verifiers/Auditors

- Query MessageStorage with `get-message-details` to view immutable logs.  
- Use VerificationEngine's `verify-message` to check authenticity and sender reputation.  
- Participate in ModerationDAO votes to resolve disputes and ensure information integrity.

That's it! A resilient, blockchain-powered network that keeps communities connected and safe during crises.

## 📚 Getting Started

To deploy and interact:  
- Install the Clarity SDK and Stacks tools.  
- Deploy the contracts in sequence (starting with UserRegistry and IncentiveToken as dependencies).  
- Build a front-end dApp using React or similar to interface with the contracts via the Stacks.js library.

This project addresses real-world vulnerabilities in emergency communication by decentralizing it, reducing reliance on fragile infrastructure, and fostering community-driven trust. Let's build a safer world! 🚀