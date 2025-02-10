import { Alert, Box, Button, Card, Heading, HStack, Icon, IconButton, Separator, Spacer, Stack, Text, Textarea, VStack } from "@chakra-ui/react"
import { Avatar } from "./components/ui/avatar"
import { Skeleton, SkeletonCircle } from "./components/ui/skeleton"
import { useProfile } from "./hooks/useProfile"

const HomePage: React.FC = () => {
  const { data, isLoading, error } = useProfile()

  return (
    <Box px={4} pt={4} pb={24}>
      <VStack gap={4} p={12}>
        <Icon boxSize={10} color="cyan.fg">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </Icon>
        <VStack gap={0}>
          <Heading size="5xl">Schedulesky</Heading>
          <Text>Bluesky 予約投稿サービス</Text>
        </VStack>
      </VStack>
      <Stack maxW="lg" mx="auto" gap={8}>
        <Stack gap={4}>
          {(!!error) && (
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>データの読み込みに失敗しました</Alert.Title>
              </Alert.Content>
            </Alert.Root>
          )}
          <Card.Root p={3}>
            {isLoading || error ? (
              <HStack>
                <SkeletonCircle size={12} />
                <Stack>
                  <Skeleton width={32} height={5} />
                  <Skeleton width={24} height={4} />
                </Stack>
              </HStack>
            ) : (
              <HStack>
                <Avatar src={data?.avatar} size="xl" />
                <Stack gap={0}>
                  <Text fontSize="md">{data?.displayName}</Text>
                  <Text fontSize="sm" color="fg.muted">{data?.handle}</Text>
                </Stack>
                <Spacer />
                <IconButton size="sm" variant="ghost" colorPalette="red" aria-label="ログアウト">
                  <Icon>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" />
                    </svg>
                  </Icon>
                </IconButton>
              </HStack>
            )}
          </Card.Root>
          <Card.Root>
            <Textarea size="lg" placeholder="最近どう？" rows={8} resize="none" autoresize border="none" focusRing="none" />
            <Text textAlign="end" px={5} py={3}>300</Text>
          </Card.Root>
          <Card.Root p={4}>
            <HStack>
              <Icon boxSize={6}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
                </svg>
              </Icon>
              <Text fontSize="sm" fontWeight="bold">日付</Text>
              <Spacer />
              <Text fontSize="sm">2024年9月18日 (水)</Text>
            </HStack>
            <Separator my={3} />
            <HStack>
              <Icon boxSize={6}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </Icon>
              <Text fontSize="sm" fontWeight="bold">時刻</Text>
              <Spacer />
              <Text fontSize="sm">12:30</Text>
            </HStack>
          </Card.Root>
        </Stack>
        <Button ms="auto" bgColor="cyan.fg" fontWeight="bold">投稿を予約</Button>
      </Stack>
    </Box>
  )
}

export default HomePage
