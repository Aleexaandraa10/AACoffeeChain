// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**

    Helper library for computing ratings, generating coffee codes, and
    checking reward/badge milestones. This library is used inside CoffeeReviews.
 */
library CoffeeLibrary {

    /**
        Computes the new average rating after a new review is submitted.
        Formula: newAvg = (oldAvg * oldCount + newRating) / (oldCount + 1)
     */
    function calculateNewAverageRating(
        uint256 oldAvg,
        uint256 oldCount,
        uint256 newRating
    ) internal pure returns (uint256) { // pure = fct de calcul; internal = accesibila doar in contract
        if (oldCount == 0) {
            return newRating;
        }
        return (oldAvg * oldCount + newRating) / (oldCount + 1);
    }

    /**
        Creates a deterministic coffee code based on its name.
        Useful if you want to auto-generate codes instead of manually writing bytes32.
     */
    function generateCoffeeCode(string memory name)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(name));
    }

    /**
        Returns true if the user is eligible for a loyalty badge.
        Example rule: badge every 5 reviews.
     */
    function checkRewardEligibility(uint256 reviewCount)
        internal
        pure
        returns (bool)
    {
        return reviewCount % 5 == 0; // badge every 5 reviews
    }
}
