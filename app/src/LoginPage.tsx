import { AbsoluteCenter, Box, Button, Card, Heading, Icon, Input, Text, VStack } from '@chakra-ui/react'
import { PopoverArrow, PopoverBody, PopoverContent, PopoverFooter, PopoverRoot, PopoverTitle, PopoverTrigger } from './components/ui/popover'

const LoginPage: React.FC = () => {
  return (
    <Box minH="svh">
      <AbsoluteCenter axis="both" w="full" maxW="28rem">
        <Card.Root w="full" px={8} py={12}>
          <VStack gap={12}>
            <VStack gap={0}>
              <Icon boxSize={10} color="cyan.fg" my={4}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </Icon>
              <Heading size="5xl">Schedulesky</Heading>
              <Text>Bluesky予約投稿サービス</Text>
            </VStack>
            <VStack gap={4}>
              <Button bgColor="cyan.fg" fontWeight="bold">Blueskyでログイン</Button>
              <PopoverRoot portalled={true}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" fontWeight="bold">セルフホストPDSの方はこちら</Button>
                </PopoverTrigger>
                <PopoverContent>
                  <PopoverArrow />
                  <PopoverBody>
                    <PopoverTitle fontWeight="bold">セルフホストPDSでログイン</PopoverTitle>
                    <Input placeholder="https://bsky.social" mt={4} focusRingColor="cyan.fg" />
                  </PopoverBody>
                  <PopoverFooter>
                    <Button size="xs" fontWeight="bold" ms="auto" bgColor="cyan.fg">ログイン</Button>
                  </PopoverFooter>
                </PopoverContent>
              </PopoverRoot>
            </VStack>
          </VStack>
        </Card.Root>
      </AbsoluteCenter>
    </Box>
  )
}

export default LoginPage
