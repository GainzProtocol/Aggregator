// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IERC20 {
    function approve(address spender, uint256 value) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);
}

contract GainzProtocolAggregator {
    function swap(
        address token,
        uint256 amount,
        address router,
        bytes4 selector,
        bytes memory data
    ) public payable {
        // Assembly block to call transferFrom and approve if token is not address(0)
        if (token != address(0)) {
            IERC20(token).transferFrom(msg.sender, address(this), amount);
            IERC20(token).approve(address(router), amount);
        }

        // Combine the `selector` (function signature) with the `data` (arguments) into a single bytes array.
        // This is typically used for dynamic function calls where the function to be called is determined at runtime.
        bytes memory callData = abi.encodePacked(selector, data);

        // Make a low-level call to the `router` contract, sending `_value` amount of Ether along with the `callData`.
        // This type of call allows for interaction with contracts in a generic way, where the function to be called,
        // the arguments, and any Ether sent are specified at runtime.
        // The `call` function returns two values:
        // `success`: a boolean indicating if the call was successful.
        // `result`: a bytes array containing any return data from the call.
        (bool success, bytes memory result) = router.call{value: msg.value}(
            callData
        );

        // If the call was not successful, revert the transaction.
        // The `RevertReasonParser.parse` function is used to decode the revert reason from the call,
        // providing more context about why the call failed. This is particularly useful for debugging and
        // providing meaningful errors to the users of the contract.
        // The string "Call failed: " is prefixed to the parsed revert reason to further clarify the source of the error.
        if (!success) {
            revert(RevertReasonParser.parse(result, "Call failed: "));
        }
    }
}

library RevertReasonParser {
    function parse(
        bytes memory data,
        string memory prefix
    ) internal pure returns (string memory) {
        // https://solidity.readthedocs.io/en/latest/control-structures.html#revert
        // We assume that revert reason is abi-encoded as Error(string)

        // 68 = 4-byte selector 0x08c379a0 + 32 bytes offset + 32 bytes length
        if (
            data.length >= 68 &&
            data[0] == "\x08" &&
            data[1] == "\xc3" &&
            data[2] == "\x79" &&
            data[3] == "\xa0"
        ) {
            string memory reason;
            // solhint-disable no-inline-assembly
            assembly {
                // 68 = 32 bytes data length + 4-byte selector + 32 bytes offset
                reason := add(data, 68)
            }
            /*
                revert reason is padded up to 32 bytes with ABI encoder: Error(string)
                also sometimes there is extra 32 bytes of zeros padded in the end:
                https://github.com/ethereum/solidity/issues/10170
                because of that we can't check for equality and instead check
                that string length + extra 68 bytes is less than overall data length
            */
            require(
                data.length >= 68 + bytes(reason).length,
                "Invalid revert reason"
            );
            return string(abi.encodePacked(prefix, "Error(", reason, ")"));
        }
        // 36 = 4-byte selector 0x4e487b71 + 32 bytes integer
        else if (
            data.length == 36 &&
            data[0] == "\x4e" &&
            data[1] == "\x48" &&
            data[2] == "\x7b" &&
            data[3] == "\x71"
        ) {
            uint256 code;
            // solhint-disable no-inline-assembly
            assembly {
                // 36 = 32 bytes data length + 4-byte selector
                code := mload(add(data, 36))
            }
            return
                string(abi.encodePacked(prefix, "Panic(", _toHex(code), ")"));
        }

        return string(abi.encodePacked(prefix, "Unknown(", _toHex(data), ")"));
    }

    function _toHex(uint256 value) private pure returns (string memory) {
        return _toHex(abi.encodePacked(value));
    }

    function _toHex(bytes memory data) private pure returns (string memory) {
        bytes16 alphabet = 0x30313233343536373839616263646566;
        bytes memory str = new bytes(2 + data.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < data.length; i++) {
            str[2 * i + 2] = alphabet[uint8(data[i] >> 4)];
            str[2 * i + 3] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }
}
