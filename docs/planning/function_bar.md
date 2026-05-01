Truth: 4 - Temporary, delete after implementing

# Empty function:
Currently shows like:
left-aligned: fₓ = f₀ [ _ _ ] [ _ _ ]
right aligned: | f₀ = _

Change: Remove right aligned portion, change _0 to _x-1.
New display:
left-aligned: fₓ = f₁₋ₓ [ _ _ ] [ _ _ ]

"f" should be replaced by the calculator name, ie:
fₓ = f₁₋ₓ [ _ _ ] [ _ _ ]
gₓ = g₁₋ₓ [ _ _ ] [ _ _ ]
hₓ = h₁₋ₓ [ _ _ ] [ _ _ ]
menuₓ = menu₁₋ₓ [ _ _ ] [ _ _ ]

# Seed entered:
Currently shows like (seed=6):
left-aligned: fₓ = f₀ [ _ _ ] [ _ _ ]
right aligned: | f₀ = 6

Change: make seed replace _x-1 instead.
New display (seed=6):
fₓ = 6 [ _ _ ] [ _ _ ]

# With roll results:
Currently shows like (seed=6, function = f_x-1 + 4 * 8):
fₓ = f₀ [ + 4 ] [ × 8 ] (remains the same after a roll append)

Change: Replace f_0/f_x-1 with previous roll result.
New display (seed=6, function = f_x-1 + 4 * 8, after 3 roll results):
fₓ = 6 [ + 4 ] [ × 8 ] (seed + function entered, but no roll)
fₓ = 80 [ + 4 ] [ × 8 ] (first result committed to roll, so roll now contains [6,80])
fₓ = 672 [ + 4 ] [ × 8 ] (roll now contains [6,80,672])
