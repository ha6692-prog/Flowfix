
import axios from 'axios';

// Assuming standard Django REST url structure from the prompt
const API_BASE = '/api/payouts';

export const fetchWallet = async () => {
    const { data } = await axios.get(\\/wallet/\);
    return data;
};

export const fetchTransactions = async ({ pageParam = 1 }) => {
    const { data } = await axios.get(\\/transactions/?page=\&page_size=10\);
    return data;
};

export const fireDemoPayout = async ({ claimId, gatewayHint = 'UPI' }) => {
    const { data } = await axios.post('/api/demo/payout/fire/', {
        claim_id: claimId,
        gateway_preference: gatewayHint
    });
    return data;
};

