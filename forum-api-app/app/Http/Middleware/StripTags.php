<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class StripTags
{
    /**
     * Whitelist-based sanitizace všech textových vstupů.
     *
     * Povoleno:
     *   - písmena (všechny jazyky), čísla, interpunkce, symboly, emoji
     *   - mezery, nové řádky, taby
     *   - max 3 diakritické znaky na písmeno (blokuje zalgo text)
     *
     * Blokováno:
     *   - HTML tagy (<script>, <img>, atd.)
     *   - Zalgo / stacked combining marks
     *   - Neviditelné kontrolní znaky (null bytes atd.)
     */
    public function handle(Request $request, Closure $next): Response
    {
        $input = $request->all();

        array_walk_recursive($input, function (&$value) {
            if (is_string($value)) {
                // 1. Strip HTML tags
                $value = strip_tags($value);

                // 2. Whitelist: letters, numbers, punctuation, symbols (emoji),
                //    spaces/separators, combining marks, format chars (ZWJ for emoji)
                //    + newlines and tabs
                $value = preg_replace('/[^\p{L}\p{N}\p{P}\p{S}\p{Z}\p{M}\p{Cf}\n\r\t]/u', '', $value);

                // 3. Limit combining marks to max 3 per character (blocks zalgo text)
                //    Normal diacritics use 1-2 marks (é, ü, etc.), zalgo stacks 50+
                //chatgpt
                $value = preg_replace('/(\p{M}{3})\p{M}+/u', '$1', $value);
            }
        });

        $request->merge($input);

        return $next($request);
    }
}
