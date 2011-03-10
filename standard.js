// TODO move from_internal logic to separate file
(function (Base) {
	var dictionary = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
		Number = Base.Number,
		valid_number = [],
		valid_number_big = /^\-?(\d+(\:\d+)*)?\.?(\d+(\:\d+)*)?$/;
	function get_validator(base) {
		//log("getting validator for "+base);
		var chars = "[" + dictionary.substr(0, base) + "]*";
		return (valid_number[base] = new RegExp("^\\-?"+chars+"\\.?"+chars+"$", "i"));
	}
	Base.extend({
		name: "standard",
		/* bool valid_base(string) */
		valid_base: function standard_valid_base(base) {
			return 2 <= base && base <= 36 && parseInt(base)+"" === base;
		},
		/* bool valid_from(int, string)*/
		valid_from: function standard_valid_from(base, number) {
			return (
				// eliminate the strings that the RegExp can't handle
				number !== "" && number !== "." && number !== "-." && number !== "-"
				
				// valid base
				&& 2 <= base && base <= 36
				&& parseInt(base)+"" === base
				
				// get the validator RegExp
				&& (valid_number[base] ? valid_number[base] : get_validator(base))
					// and test the number on that RegExp
					.test(number)
			);
		},
		/* bool valid_to(int, internal_number) */
		valid_to: function standard_valid_to(base, number) {
			return (
				// any real number is fine
				// valid base
				2 <= base && base <= 36
				&& parseInt(base)+"" === base
			);
		},
		fractional: true,
		
		// parameters number and base
		to_internal: function standard_to_internal(from_base, number) {
			if (typeof number !== "string") {
				number += "";
			}
			number = number
				.toUpperCase()
				.split(".");
			var positive = (number[0].charAt(0) !== "-"),
				i,
				result = Number(),
				fract_result,
				integ = ( positive ? // skip first character or not?
					number[0] :
					number[0].substr(1) ),
				fract = number[1];

			// find the integer part of the result
			for (i = 0; i < integ.length; i++) {
				// result = result * from_base + digits.indexOf(integ.charAt(i))
				result.mul(from_base).add(dictionary.indexOf( integ.charAt(i) ));
			}

			// find the fractional part of the result
			if (fract) {
				fract_result = Number();
				for (i = 0; i < fract.length; i++) {
					fract_result.mul(from_base).add(dictionary.indexOf( fract.charAt(i) ));
				}
				fract_result.mul(Number.pow(from_base, -fract.length));
				
				// result = result + fract_result
				result.add(fract_result);
			}

			return ( positive ?
				result :
				result.neg() );
		},
		
		
		// parameters number and base
		from_internal: function standard_from_internal(to_base, number) {
			number = number.clone(); // we must work on a copy
			if (number.equals(Number.ZERO)) {
				return "0";
			}
			var tmp, i,
				is_negative = number.cmp(0) < 0, // negative ?
				result = [],
				result_fract,
				fract = Number.mod(number.abs(), 1), // the fractional part; make the number non-negative
				significant_digits = 0,
				max_significant_digits,
				integer_digits;
			
			number.floor();
			
			// number of significant digits we can safely handle (53 bits)
			// TODO - don't hard code this - perhaps number.PRECISION? How to handle those that do integer part and fractional part separately?
			max_significant_digits = 53 * Math.log(2) / Math.log(to_base);
		

			// find the integer part of the result
			if (number.equals(Number.ZERO)) {
				result.push(0);
			} else {
				for (; number.cmp(0) > 0; significant_digits++) {
					tmp = Number.mod(number, to_base).get_number();
					result.unshift(tmp);
					// number = (number - tmp) / to;
					number.sub(tmp).div(to_base);
				}
			}
			integer_digits = result.length;
			// find the fractional part of the result
			if (!fract.equals(Number.ZERO) && significant_digits < max_significant_digits) {
				for (; significant_digits < max_significant_digits; significant_digits++) {
					// fract *= to;
					fract.mul(to_base);
					tmp = Number.floor(fract);
					// fract -= tmp;
					fract.sub(tmp);
					result.push(tmp.get_number());
				}
				
				// round (away from zero)
				if (result.pop() >= to_base / 2) {
					tmp = result.length;
					
					// add 1 to the last element, but if it's to_base, we'll have to remove it, and check the next
					while (++result[--tmp] == to_base) {
						if (tmp > integer_digits) {
							// we're behind the decimal point, remove the last digit
							result.pop();
						} else {
							// we're in the integer part - can't remove this digit: instead set it to zero
							result[tmp] = 0;
						}
					}
				} else {
					tmp = result.length;
					while (result[--tmp] === 0 && tmp > integer_digits) {
						result.pop();
					}
				}
				for (i = result.length - 1; i >= 0; i--) {
					result[i] = dictionary.charAt(result[i]);
				}
				result = result.slice(0, integer_digits).join("") + "." + result.slice(integer_digits).join("");
			} else {
				for (i = result.length - 1; i >= 0; i--) {
					result[i] = dictionary.charAt(result[i]);
				}
				result = result.join("");
			}
			
			if (is_negative) {
				result = "-" + result;
			}
			return result;
		},
		options: {
			uppercase: true
		}
	});


	// standard_big
	Base.extend({
		name: "standard_big",
		/* bool valid_base(string) */
		valid_base: function standard_valid_base(base) {
			return 36 < base && parseInt(base)+"" === base;
		},
		/* bool valid_from(string, string)*/
		valid_from: function standard_valid_from(base, number) {
			if (
				// eliminate the strings that the RegExp can't handle
				number !== "" && number !== "." && number !== "-." && number !== "-"
				
				// valid base
				&& 36 < base
				&& parseInt(base)+"" === base
				
				&& valid_number_big.test(number)
			) {
				number = number.split(/[-\.\:]/);
				base = parseInt(base);
				for (var i = number.length - 1; i >= 0; i--) {
					if (number[i] >= base) {
						return false;
					}
				}
				return true;
			}
			return false;
		},
		/* bool valid_to(string, internal_number) */
		valid_to: function standard_valid_to(base, number) {
			return (
				// any real number is fine
				// valid base
				36 < base
				&& parseInt(base)+"" === base
			);
		},
		fractional: true,
		
		// parameters number and base
		to_internal: function standard_to_internal(from_base, number) {
			from_base = parseInt(from_base);
			number = number.split(".");
			var positive = (number[0].charAt(0) !== "-"),
				i,
				result = Number(),
				fract_result,
				integ = ( positive ? // skip first character or not?
					number[0] :
					number[0].substr(1) ),
				fract = (number[1] ? number[1].split(":") : []);
			integ = (integ ? integ.split(":") : []);

			// TODO put integer and fractional part together

			// find the integer part of the result
			for (i = 0; i < integ.length; i++) {
				// result = result * from_base + integ[i]
				result.mul(from_base).add(integ[i]);
			}
			// find the fractional part of the result
			if (fract.length) {
				fract_result = Number();
				for (i = 0; i < fract.length; i++) {
					fract_result.mul(from_base).add(fract[i]);
				}
				fract_result.mul(Number.pow(from_base, -fract.length));
				// result = result + fract_result
				result.add(fract_result);
			}

			return ( positive ?
				result :
				result.neg() );
		},
		
		
		// parameters number and base
		from_internal: function standard_from_internal(to_base, number) {
			number = number.clone(); // we must work on a copy
			if (number.equals(Number.ZERO)) {
				return "0";
			}
			var tmp,
				is_negative = number.cmp(0) < 0, // negative ?
				result = [],
				result_fract,
				fract = Number.mod(number.abs(), 1), // the fractional part; make the number non-negative
				significant_digits = 0,
				max_significant_digits,
				integer_digits;
			
			number.floor();
			
			// number of significant digits we can safely handle (53 bits)
			// TODO - don't hard code this - perhaps number.PRECISION? How to handle those that do integer part and fractional part separately?
			max_significant_digits = 53 * Math.log(2) / Math.log(to_base);
		

			// find the integer part of the result
			if (number.equals(Number.ZERO)) {
				result.push(0);
			} else {
				for (; number.cmp(0) > 0; significant_digits++) {
					tmp = Number.mod(number, to_base).get_number();
					result.unshift(tmp);
					// number = (number - tmp) / to;
					number.sub(tmp).div(to_base);
				}
			}
			integer_digits = result.length;
			// find the fractional part of the result
			if (!fract.equals(Number.ZERO) && significant_digits < max_significant_digits) {
				for (; significant_digits < max_significant_digits; significant_digits++) {
					// fract *= to;
					fract.mul(to_base);
					tmp = Number.floor(fract);
					// fract -= tmp;
					fract.sub(tmp);
					result.push(tmp.get_number());
				}
				
				// round (away from zero)
				if (result.pop() >= to_base / 2) {
					tmp = result.length;
					
					// add 1 to the last element, but if it's to_base, we'll have to remove it, and check the next
					while (++result[--tmp] == to_base) {
						if (tmp > integer_digits) {
							// we're behind the decimal point, remove the last digit
							result.pop();
						} else {
							// we're in the integer part - can't remove this digit: instead set it to zero
							result[tmp] = 0;
						}
					}
				} else {
					tmp = result.length;
					while (result[--tmp] === 0 && tmp > integer_digits) {
						result.pop();
					}
				}
				result = result.slice(0, integer_digits).join(":") + "." + result.slice(integer_digits).join(":");
			} else {
				result = result.join(":");
			}
			
			if (is_negative) {
				result = "-" + result;
			}
			return result;
		},
		options: {
		}
	});
})(Base);













