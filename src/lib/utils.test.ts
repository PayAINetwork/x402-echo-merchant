import { describe, it, expect } from 'vitest';
import { getHumanFriendlyNetworkName, isCAIP2Format } from './utils';

describe('Network Display Functions', () => {
  describe('getHumanFriendlyNetworkName', () => {
    it('should convert friendly network names to human-readable format', () => {
      expect(getHumanFriendlyNetworkName('base')).toBe('Base');
      expect(getHumanFriendlyNetworkName('base-sepolia')).toBe('Base Sepolia');
      expect(getHumanFriendlyNetworkName('solana-devnet')).toBe('Solana Devnet');
      expect(getHumanFriendlyNetworkName('avalanche-fuji')).toBe('Avalanche Fuji');
      expect(getHumanFriendlyNetworkName('polygon-amoy')).toBe('Polygon Amoy');
      expect(getHumanFriendlyNetworkName('sei-testnet')).toBe('Sei Testnet');
      expect(getHumanFriendlyNetworkName('xlayer-testnet')).toBe('Xlayer Testnet');
    });

    it('should convert CAIP-2 format to human-readable format', () => {
      // EVM networks
      expect(getHumanFriendlyNetworkName('eip155:8453')).toBe('Base');
      expect(getHumanFriendlyNetworkName('eip155:84532')).toBe('Base Sepolia');
      expect(getHumanFriendlyNetworkName('eip155:43114')).toBe('Avalanche');
      expect(getHumanFriendlyNetworkName('eip155:43113')).toBe('Avalanche Fuji');
      expect(getHumanFriendlyNetworkName('eip155:137')).toBe('Polygon');
      expect(getHumanFriendlyNetworkName('eip155:80002')).toBe('Polygon Amoy');
      expect(getHumanFriendlyNetworkName('eip155:1329')).toBe('Sei');
      expect(getHumanFriendlyNetworkName('eip155:713715')).toBe('Sei Testnet');
      expect(getHumanFriendlyNetworkName('eip155:196')).toBe('Xlayer');
      expect(getHumanFriendlyNetworkName('eip155:1952')).toBe('Xlayer Testnet');
      expect(getHumanFriendlyNetworkName('eip155:3338')).toBe('Peaq');
      expect(getHumanFriendlyNetworkName('eip155:4689')).toBe('Iotex');

      // SVM networks
      expect(getHumanFriendlyNetworkName('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')).toBe('Solana');
      expect(getHumanFriendlyNetworkName('solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1')).toBe('Solana Devnet');
    });

    it('should handle unknown CAIP-2 networks gracefully', () => {
      const unknownCAIP2 = 'eip155:999999';
      // Should return the CAIP-2 format capitalized properly
      expect(getHumanFriendlyNetworkName(unknownCAIP2)).toBe('Eip155:999999');
    });

    it('should handle single-word networks', () => {
      expect(getHumanFriendlyNetworkName('solana')).toBe('Solana');
      expect(getHumanFriendlyNetworkName('polygon')).toBe('Polygon');
      expect(getHumanFriendlyNetworkName('avalanche')).toBe('Avalanche');
    });
  });

  describe('isCAIP2Format', () => {
    it('should detect CAIP-2 format correctly', () => {
      // EVM CAIP-2 formats
      expect(isCAIP2Format('eip155:8453')).toBe(true);
      expect(isCAIP2Format('eip155:84532')).toBe(true);
      expect(isCAIP2Format('eip155:137')).toBe(true);

      // SVM CAIP-2 formats
      expect(isCAIP2Format('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')).toBe(true);
      expect(isCAIP2Format('solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1')).toBe(true);
    });

    it('should return false for friendly network names', () => {
      expect(isCAIP2Format('base')).toBe(false);
      expect(isCAIP2Format('base-sepolia')).toBe(false);
      expect(isCAIP2Format('solana-devnet')).toBe(false);
      expect(isCAIP2Format('avalanche-fuji')).toBe(false);
      expect(isCAIP2Format('polygon-amoy')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isCAIP2Format('')).toBe(false);
      expect(isCAIP2Format('unknown:network')).toBe(true); // Still has colon
    });
  });
});
