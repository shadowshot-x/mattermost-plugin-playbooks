// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import React, {useRef} from 'react';
import {FormattedMessage, useIntl} from 'react-intl';
import {useDispatch, useSelector} from 'react-redux';
import styled from 'styled-components';

import {Redirect} from 'react-router-dom';

import {displayPlaybookCreateModal} from 'src/actions';
import {PrimaryButton, TertiaryButton} from 'src/components/assets/buttons';
import BackstageListHeader from 'src/components/backstage/backstage_list_header';
import PlaybookListRow from 'src/components/backstage/playbook_list_row';
import SearchInput from 'src/components/backstage/search_input';
import {BackstageSubheader, HorizontalSpacer} from 'src/components/backstage/styles';
import TemplateSelector from 'src/components/templates/template_selector';
import {PaginationRow} from 'src/components/pagination_row';
import {SortableColHeader} from 'src/components/sortable_col_header';
import {BACKSTAGE_LIST_PER_PAGE} from 'src/constants';
import {useCanCreatePlaybooksInTeam, usePlaybooksCrud, usePlaybooksRouting} from 'src/hooks';
import {useImportPlaybook} from 'src/components/backstage/import_playbook';
import {Playbook} from 'src/types/playbook';
import PresetTemplates from 'src/components/templates/template_data';
import {RegularHeading} from 'src/styles/headings';
import {pluginUrl} from 'src/browser_routing';

import Header from 'src/components/widgets/header';

import CheckboxInput from './runs_list/checkbox_input';
import useConfirmPlaybookArchiveModal from './archive_playbook_modal';
import NoContentPage from './playbook_list_getting_started';
import useConfirmPlaybookRestoreModal from './restore_playbook_modal';

const ContainerMedium = styled.article`
    padding: 0 20px;
    scroll-margin-top: 20px;
`;

const PlaybookListContainer = styled.div`
    color: rgba(var(--center-channel-color-rgb), 0.9);
`;

const TableContainer = styled.div`
    overflow-x: hidden;
    overflow-x: clip;
`;

const CreatePlaybookHeader = styled(BackstageSubheader)`
    margin-top: 4rem;
    padding: 4rem 0 3.2rem;
    display: grid;
    justify-items: space-between;
`;

export const Heading = styled.h1`
    ${RegularHeading} {
    }
    font-size: 2.8rem;
    line-height: 3.6rem;
    margin: 0;
`;

const Sub = styled.p`
    font-size: 16px;
    line-height: 24px;
    color: rgba(var(--center-channel-color-rgb), 0.72);
    font-weight: 400;
    max-width: 650px;
    margin-top: 12px;
`;

const AltCreatePlaybookHeader = styled(BackstageSubheader)`
    margin-top: 1rem;
    padding-top: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
`;

export const AltHeading = styled(Heading)`
    font-weight: 600;
    font-size: 20px;
    line-height: 28px;
    text-align: center;
`;

const AltSub = styled(Sub)`
    text-align: center;
    margin-bottom: 36px;
`;

const TitleActions = styled.div`
    display: flex;
`;

const ImportSub = styled(Sub)`
    margin-top: 8px;
    margin-bottom: 0;
    font-size: 14px;
    line-height: 20px;
    color: inherit;
`;

const ImportLink = styled.a`
    font-weight: 600;
`;

const PlaybooksListFilters = styled.div`
    display: flex;
    padding: 16px;
    align-items: center;
`;

const PlaybookList = (props: {firstTimeUserExperience?: boolean}) => {
    const {formatMessage} = useIntl();
    const teamId = useSelector(getCurrentTeamId);
    const canCreatePlaybooks = useCanCreatePlaybooksInTeam(teamId);
    const content = useRef<JSX.Element | null>(null);
    const selectorRef = useRef<HTMLDivElement>(null);

    const {
        playbooks,
        isLoading, totalCount, params,
        setPage, sortBy, setSelectedPlaybook, archivePlaybook, restorePlaybook, duplicatePlaybook, setSearchTerm, isFiltering, setWithArchived, fetchPlaybooks,
    } = usePlaybooksCrud({per_page: BACKSTAGE_LIST_PER_PAGE});

    const [confirmArchiveModal, openConfirmArchiveModal] = useConfirmPlaybookArchiveModal(archivePlaybook);
    const [confirmRestoreModal, openConfirmRestoreModal] = useConfirmPlaybookRestoreModal(restorePlaybook);

    const {view, edit} = usePlaybooksRouting<string>({onGo: setSelectedPlaybook});
    const [fileInputRef, inputImportPlaybook] = useImportPlaybook(teamId, (id: string) => edit(id));

    const hasPlaybooks = Boolean(playbooks?.length);

    if (props.firstTimeUserExperience && hasPlaybooks) {
        return <Redirect to={pluginUrl('/playbooks')}/>;
    }

    const scrollToTemplates = () => {
        selectorRef.current?.scrollIntoView({behavior: 'smooth'});
    };

    const handleImportClick = () => {
        if (fileInputRef && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    let listBody: JSX.Element | JSX.Element[] | null = null;
    if (!hasPlaybooks && isFiltering) {
        listBody = (
            <div className='text-center pt-8'>
                <FormattedMessage defaultMessage='There are no playbooks matching those filters.'/>
            </div>
        );
    } else if (playbooks) {
        listBody = playbooks.map((p: Playbook) => (
            <PlaybookListRow
                key={p.id}
                playbook={p}
                onClick={() => view(p.id)}
                onEdit={() => edit(p.id)}
                onRestore={() => openConfirmRestoreModal({id: p.id, title: p.title})}
                onArchive={() => openConfirmArchiveModal(p)}
                onDuplicate={() => duplicatePlaybook(p.id)}
                onMembershipChanged={() => fetchPlaybooks()}
            />
        ));
    }

    const makePlaybookList = () => {
        if (props.firstTimeUserExperience || (!hasPlaybooks && !isFiltering)) {
            return (
                <>
                    <NoContentPage
                        canCreatePlaybooks={canCreatePlaybooks}
                        scrollToNext={scrollToTemplates}
                    />
                    {inputImportPlaybook}
                </>
            );
        }

        return (
            <TableContainer>
                <Header
                    data-testid='titlePlaybook'
                    level={2}
                    heading={formatMessage({defaultMessage: 'Playbooks'})}
                    subtitle={formatMessage({defaultMessage: 'All the playbooks that you can access will show here'})}
                    right={(
                        <TitleActions>
                            {canCreatePlaybooks && (
                                <>
                                    <ImportButton
                                        onClick={handleImportClick}
                                    />
                                    <HorizontalSpacer size={12}/>
                                    <PlaybookModalButton/>
                                </>
                            )}
                        </TitleActions>
                    )}
                    css={`
                        border-bottom: 1px solid rgba(var(--center-channel-color-rgb), 0.16);
                    `}
                />
                <PlaybooksListFilters>
                    <SearchInput
                        testId={'search-filter'}
                        default={params.search_term}
                        onSearch={setSearchTerm}
                        placeholder={formatMessage({defaultMessage: 'Search for a playbook'})}
                    />
                    <HorizontalSpacer size={12}/>
                    <CheckboxInput
                        testId={'with-archived'}
                        text={formatMessage({defaultMessage: 'With archived'})}
                        checked={params.with_archived}
                        onChange={setWithArchived}
                    />
                    <HorizontalSpacer size={12}/>
                    {inputImportPlaybook}
                </PlaybooksListFilters>
                <BackstageListHeader $edgeless={true}>
                    <div className='row'>
                        <div className='col-sm-4'>
                            <SortableColHeader
                                name={formatMessage({defaultMessage: 'Name'})}
                                direction={params.direction}
                                active={params.sort === 'title'}
                                onClick={() => sortBy('title')}
                            />
                        </div>
                        <div className='col-sm-2'>
                            <SortableColHeader
                                name={formatMessage({defaultMessage: 'Last used'})}
                                direction={params.direction}
                                active={params.sort === 'last_run_at'}
                                onClick={() => sortBy('last_run_at')}
                            />
                        </div>
                        <div className='col-sm-2'>
                            <SortableColHeader
                                name={formatMessage({defaultMessage: 'Active Runs'})}
                                direction={params.direction}
                                active={params.sort === 'active_runs'}
                                onClick={() => sortBy('active_runs')}
                            />
                        </div>
                        <div className='col-sm-2'>
                            <SortableColHeader
                                name={formatMessage({defaultMessage: 'Runs'})}
                                direction={params.direction}
                                active={params.sort === 'runs'}
                                onClick={() => sortBy('runs')}
                            />
                        </div>
                        <div className='col-sm-2'>
                            <FormattedMessage defaultMessage='Actions'/>
                        </div>
                    </div>
                </BackstageListHeader>
                {listBody}
                <PaginationRow
                    page={params.page}
                    perPage={params.per_page}
                    totalCount={totalCount}
                    setPage={setPage}
                />
            </TableContainer>
        );
    };

    // If we don't have a bottomHalf, create it. Or if we're loading new playbooks, use the previous body.
    if (!content.current || !isLoading) {
        content.current = makePlaybookList();
    }

    return (
        <PlaybookListContainer>
            {content.current}
            {canCreatePlaybooks && (
                <>
                    <ContainerMedium
                        ref={selectorRef}
                    >
                        {props.firstTimeUserExperience || (!hasPlaybooks && !isFiltering) ? (
                            <AltCreatePlaybookHeader>
                                <AltHeading>
                                    {formatMessage({defaultMessage: 'Choose a template'})}
                                </AltHeading>
                                <ImportSub>
                                    {formatMessage({defaultMessage: 'or <ImportPlaybookButton>Import a playbook</ImportPlaybookButton>'}, {
                                        ImportPlaybookButton: (chunks) => (
                                            <ImportLinkButton
                                                onClick={handleImportClick}
                                            >
                                                {chunks}
                                            </ImportLinkButton>
                                        ),
                                    })}
                                </ImportSub>
                                <AltSub>
                                    {formatMessage({defaultMessage: 'There are templates for a range of use cases and events. You can use a playbook as-is or customize it—then share it with your team.'})}
                                </AltSub>
                            </AltCreatePlaybookHeader>
                        ) : (
                            <CreatePlaybookHeader>
                                <Heading>
                                    {formatMessage({defaultMessage: 'Do more with Playbooks'})}
                                </Heading>
                                <Sub>
                                    {formatMessage({defaultMessage: 'There are templates for a range of use cases and events. You can use a playbook as-is or customize it—then share it with your team.'})}
                                </Sub>
                            </CreatePlaybookHeader>
                        )}
                        <TemplateSelector
                            templates={props.firstTimeUserExperience || (!hasPlaybooks && !isFiltering) ? swapEnds(PresetTemplates) : PresetTemplates}
                        />
                    </ContainerMedium>
                </>
            )}
            {confirmArchiveModal}
            {confirmRestoreModal}
        </PlaybookListContainer>
    );
};

function swapEnds(arr: Array<any>) {
    return [arr[arr.length - 1], ...arr.slice(1, -1), arr[0]];
}

const ImportButton = (props: {onClick?: () => void}) => {
    return (
        <TertiaryButton
            onClick={props.onClick}
        >
            <FormattedMessage defaultMessage='Import'/>
        </TertiaryButton>
    );
};

const ImportLinkButton = (props: {children: React.ReactNode | React.ReactNode[]; onClick?: () => void}) => {
    return (
        <ImportLink onClick={props.onClick}>
            {props.children}
        </ImportLink>
    );
};

const PlaybookModalButton = () => {
    const {formatMessage} = useIntl();
    const dispatch = useDispatch();

    return (
        <CreatePlaybookButton
            onClick={() => dispatch(displayPlaybookCreateModal({}))}
        >
            <i className='icon-plus mr-2'/>
            {formatMessage({defaultMessage: 'Create playbook'})}
        </CreatePlaybookButton>
    );
};

const CreatePlaybookButton = styled(PrimaryButton)`
    display: flex;
    align-items: center;
`;
export default PlaybookList;
