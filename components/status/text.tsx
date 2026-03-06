import { Link } from "expo-router";
import React, { Fragment, useCallback, useMemo } from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";
import { jsx, jsxs } from "react/jsx-runtime";
import RehypeRaw from "rehype-raw";
import RehypeReact from "rehype-react";
import RehypeSanitize from "rehype-sanitize";
import RemarkBreaks from "remark-breaks";
import RemarkParse from "remark-parse";
import RemarkRehype from "remark-rehype";
import twitter from "twitter-text";
import { unified } from "unified";

export const StatusText = ({ status }: { status: string }) => {
  const handleLinkPress = useCallback((url: string) => {
    Linking.openURL(url);
  }, []);

  const val = useMemo(() => {
    const html = twitter.autoLinkHashtags(status, {
      hashtagUrlBase: "/search?exact=true%q=%23",
    });
    const u = unified()
      .use(RemarkParse)
      .use(RemarkBreaks)
      .use(RemarkRehype, { allowDangerousHtml: true })
      .use(RehypeRaw)
      .use(RehypeSanitize)
      .use(RehypeReact, {
        Fragment,
        jsx,
        jsxs,
        components: {
          h1: Fragment,
          h2: Fragment,
          h3: Fragment,
          h4: Fragment,
          h5: Fragment,
          h6: Fragment,
          code: Fragment,
          pre: Fragment,
          a: ({ href, children }: { href: string; children: React.ReactNode }) => {
            if (href.startsWith("/")) {
              return (
                // @ts-expect-error
                <Link className="text-blue-500 dark:text-blue-600" href={href}>
                  {children}
                </Link>
              );
            }

            return (
              <TouchableOpacity className="text-blue-500 dark:text-blue-600" onPress={() => handleLinkPress(href)}>
                {children}
              </TouchableOpacity>
            );
          },
          br: () => <Text>{"\n"}</Text>,
          p: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
        },
      });

    return u.processSync(html).result;
  }, [status, handleLinkPress]);

  return <View>{val}</View>;
};
