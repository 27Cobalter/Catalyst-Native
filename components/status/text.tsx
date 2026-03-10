import { Link } from "expo-router";
import React, { Fragment, useCallback, useMemo } from "react";
import { Linking, Text } from "react-native";
import { jsx, jsxs } from "react/jsx-runtime";
import RehypeRaw from "rehype-raw";
import RehypeReact from "rehype-react";
import RehypeSanitize from "rehype-sanitize";
import RemarkBreaks from "remark-breaks";
import RemarkParse from "remark-parse";
import RemarkRehype from "remark-rehype";
import twitter from "twitter-text";
import { unified } from "unified";
import { withUniwind } from "uniwind";

const UniLink = withUniwind(Link);

export const StatusText = React.memo(
  ({ status }: { status: string }) => {
    const handleLinkPress = useCallback((url: string) => {
      Linking.openURL(url);
    }, []);

    const val = useMemo(() => {
      console.log(status);
      const html = twitter.autoLink(status, {
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
            h1: ({ children }: { children: React.ReactNode }) => (
              <Text className="text-black dark:text-white">{children}</Text>
            ),
            h2: ({ children }: { children: React.ReactNode }) => (
              <Text className="text-black dark:text-white">{children}</Text>
            ),
            h3: ({ children }: { children: React.ReactNode }) => (
              <Text className="text-black dark:text-white">{children}</Text>
            ),
            h4: ({ children }: { children: React.ReactNode }) => (
              <Text className="text-black dark:text-white">{children}</Text>
            ),
            h5: ({ children }: { children: React.ReactNode }) => (
              <Text className="text-black dark:text-white">{children}</Text>
            ),
            h6: ({ children }: { children: React.ReactNode }) => (
              <Text className="text-black dark:text-white">{children}</Text>
            ),
            code: ({ children }: { children: React.ReactNode }) => (
              <Text className="text-black dark:text-white">{children}</Text>
            ),
            pre: ({ children }: { children: React.ReactNode }) => (
              <Text className="text-black dark:text-white">{children}</Text>
            ),
            div: ({ children }: { children: React.ReactNode }) => (
              <Text className="text-black dark:text-white">{children}</Text>
            ),
            a: ({ href, children }: { href: string; children: React.ReactNode }) => {
              if (href.startsWith("/")) {
                return (
                  // @ts-expect-error
                  <UniLink className="text-blue-500 leading-none" href={href}>
                    {children}
                  </UniLink>
                );
              }

              return (
                <Text className="text-blue-500 leading-none" onPress={() => handleLinkPress(href)}>
                  {children}
                </Text>
              );
            },
            br: () => <Text className="text-black dark:text-white">{"\n"}</Text>,
            p: ({ children }: { children: React.ReactNode }) => (
              <Text className="text-black dark:text-white">{children}</Text>
            ),
          },
        });

      return u.processSync(html).result;
    }, [status, handleLinkPress]);

    return <Text className="text-black dark:text-white">{val}</Text>;
  },
  (a, b) => a.status === b.status,
);
StatusText.displayName = "StatusText";
