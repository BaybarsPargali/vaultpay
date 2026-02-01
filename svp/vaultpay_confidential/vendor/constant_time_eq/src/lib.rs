//! Compares two equal-sized byte strings in constant time.
//!
//! This crate provides a constant-time comparison function for byte slices.

#![no_std]
#![forbid(unsafe_code)]

#[cfg(feature = "std")]
extern crate std;

/// Compares two equal-sized byte strings in constant time.
///
/// # Panics
///
/// Panics if the two slices have different lengths.
#[inline]
pub fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    assert_eq!(a.len(), b.len());
    constant_time_eq_n(a, b)
}

/// Compares two equal-sized byte strings in constant time.
///
/// Returns `false` if the slices have different lengths.
#[inline]
pub fn constant_time_eq_n(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }

    let mut result: u8 = 0;
    for (x, y) in a.iter().zip(b.iter()) {
        result |= x ^ y;
    }
    result == 0
}

/// Compares two 16-byte strings in constant time.
#[inline]
pub fn constant_time_eq_16(a: &[u8; 16], b: &[u8; 16]) -> bool {
    constant_time_eq_n(a, b)
}

/// Compares two 32-byte strings in constant time.
#[inline]
pub fn constant_time_eq_32(a: &[u8; 32], b: &[u8; 32]) -> bool {
    constant_time_eq_n(a, b)
}

/// Compares two 64-byte strings in constant time.
#[inline]
pub fn constant_time_eq_64(a: &[u8; 64], b: &[u8; 64]) -> bool {
    constant_time_eq_n(a, b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_equal() {
        let a = [1, 2, 3, 4];
        let b = [1, 2, 3, 4];
        assert!(constant_time_eq(&a, &b));
    }

    #[test]
    fn test_not_equal() {
        let a = [1, 2, 3, 4];
        let b = [1, 2, 3, 5];
        assert!(!constant_time_eq(&a, &b));
    }
}
