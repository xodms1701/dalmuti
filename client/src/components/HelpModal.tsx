import React from "react";
import styled from "styled-components";

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const Modal = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f0f0f0;
  }
`;

const Title = styled.h2`
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 1.5rem;
  padding-right: 2rem;
`;

const Section = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.2rem;
  color: #4a90e2;
  margin-bottom: 0.75rem;
`;

const Text = styled.p`
  font-size: 1rem;
  color: #666;
  line-height: 1.6;
  margin-bottom: 0.5rem;
`;

const List = styled.ul`
  margin-left: 1.5rem;
  margin-bottom: 0.5rem;
`;

const ListItem = styled.li`
  font-size: 1rem;
  color: #666;
  line-height: 1.6;
  margin-bottom: 0.25rem;
`;

const Highlight = styled.span`
  color: #4a90e2;
  font-weight: bold;
`;

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "lobby" | "room" | "roleSelection" | "play" | "general";
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, type }) => {
  if (!isOpen) return null;

  const renderContent = () => {
    switch (type) {
      case "lobby":
        return (
          <>
            <Section>
              <SectionTitle>달무티 게임이란?</SectionTitle>
              <Text>
                4~8명이 함께 즐기는 카드 게임으로, 카드를 가장 먼저 없애는
                사람이 승리합니다.
              </Text>
            </Section>
            <Section>
              <SectionTitle>게임 시작하기</SectionTitle>
              <List>
                <ListItem>
                  <Highlight>방 만들기:</Highlight> 새로운 게임방을 만들고
                  친구들을 초대할 수 있습니다.
                </ListItem>
                <ListItem>
                  <Highlight>방 참가하기:</Highlight> 친구가 공유한 초대코드를
                  입력하여 게임에 참가합니다.
                </ListItem>
              </List>
            </Section>
          </>
        );

      case "room":
        return (
          <>
            <Section>
              <SectionTitle>게임 준비</SectionTitle>
              <Text>
                게임을 시작하려면 <Highlight>4~8명</Highlight>의 플레이어가
                필요합니다.
              </Text>
              <Text>
                모든 플레이어가 "준비 완료" 상태가 되면, 방장이 게임을 시작할
                수 있습니다.
              </Text>
            </Section>
            <Section>
              <SectionTitle>방 코드 공유하기</SectionTitle>
              <Text>
                화면에 표시된 방 코드를 친구들에게 공유하여 게임에 초대하세요.
              </Text>
            </Section>
          </>
        );

      case "roleSelection":
        return (
          <>
            <Section>
              <SectionTitle>역할 선택이란?</SectionTitle>
              <Text>
                13장의 카드 중 하나를 선택하여 이번 라운드의{" "}
                <Highlight>초기 순위</Highlight>를 결정합니다.
              </Text>
              <Text>
                <Highlight>낮은 숫자</Highlight>를 선택할수록 높은 순위를
                가지게 됩니다. (1이 가장 높은 순위)
              </Text>
            </Section>
            <Section>
              <SectionTitle>선택 방법</SectionTitle>
              <List>
                <ListItem>카드를 클릭하여 자신의 역할을 선택합니다.</ListItem>
                <ListItem>
                  다른 플레이어가 선택한 카드는 선택할 수 없습니다.
                </ListItem>
                <ListItem>
                  모든 플레이어가 선택을 완료하면 다음 단계로 진행됩니다.
                </ListItem>
              </List>
            </Section>
          </>
        );

      case "play":
        return (
          <>
            <Section>
              <SectionTitle>게임 진행 방법</SectionTitle>
              <Text>
                <Highlight>낮은 숫자</Highlight>의 카드일수록 강한 카드입니다.
                (1이 가장 강함, 13이 가장 약함)
              </Text>
            </Section>
            <Section>
              <SectionTitle>카드 내는 규칙</SectionTitle>
              <List>
                <ListItem>
                  자신의 차례에 카드를 낼 수 있습니다.
                </ListItem>
                <ListItem>
                  이전 플레이어가 낸 카드보다 <Highlight>낮은 숫자</Highlight>의
                  카드를 내야 합니다.
                </ListItem>
                <ListItem>
                  이전 플레이어가 낸 <Highlight>같은 개수</Highlight>의 카드를
                  내야 합니다.
                </ListItem>
                <ListItem>
                  여러 장을 낼 때는 <Highlight>같은 숫자</Highlight>만 낼 수
                  있습니다.
                </ListItem>
                <ListItem>
                  조커는 다른 카드와 함께 낼 때 와일드카드로 사용됩니다.
                </ListItem>
              </List>
            </Section>
            <Section>
              <SectionTitle>패스하기</SectionTitle>
              <Text>
                낼 수 있는 카드가 없거나 전략적으로 카드를 내고 싶지 않을 때
                "패스" 버튼을 누르세요.
              </Text>
              <Text>
                모든 플레이어가 패스하면 마지막으로 카드를 낸 플레이어가 다시
                시작합니다.
              </Text>
            </Section>
            <Section>
              <SectionTitle>승리 조건</SectionTitle>
              <Text>
                카드를 가장 먼저 모두 없애는 플레이어가 1등이 됩니다!
              </Text>
            </Section>
          </>
        );

      case "general":
      default:
        return (
          <>
            <Section>
              <SectionTitle>달무티 게임 규칙</SectionTitle>
              <Text>
                4~8명이 플레이하는 카드 게임으로, 카드를 가장 먼저 없애는
                사람이 승리합니다.
              </Text>
            </Section>
            <Section>
              <SectionTitle>카드 강도</SectionTitle>
              <Text>
                <Highlight>숫자가 낮을수록</Highlight> 강한 카드입니다.
              </Text>
              <Text>1(가장 강함) → 2 → 3 → ... → 12 → 13(가장 약함)</Text>
            </Section>
            <Section>
              <SectionTitle>게임 흐름</SectionTitle>
              <List>
                <ListItem>1. 역할 선택으로 초기 순위 결정</ListItem>
                <ListItem>2. 순위에 따라 카드 덱 선택</ListItem>
                <ListItem>3. 순위 순서대로 카드를 내며 게임 진행</ListItem>
                <ListItem>4. 카드를 가장 먼저 없애는 사람이 승리</ListItem>
              </List>
            </Section>
          </>
        );
    }
  };

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>×</CloseButton>
        <Title>게임 도움말</Title>
        {renderContent()}
      </Modal>
    </Overlay>
  );
};

export default HelpModal;
