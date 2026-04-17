
import { useQuery } from '@tanstack/react-query';
import { fetchWallet } from '../services/payoutApi';

export const usePayoutPolling = (isPollingActive) => {
    return useQuery({
        queryKey: ['wallet'],
        queryFn: fetchWallet,
        // Poll every 2 seconds if isPollingActive is true
        refetchInterval: isPollingActive ? 2000 : false,
        refetchIntervalInBackground: true,
        // Helps to avoid unnecessary flashing
        staleTime: 5000,
    });
};

