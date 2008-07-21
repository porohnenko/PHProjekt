<?php
/**
 * User-Tag <-> Modules relation class
 *
 * LICENSE: Licensed under the terms of the PHProjekt 6 License
 *
 * @copyright  2007 Mayflower GmbH (http://www.mayflower.de)
 * @license    http://phprojekt.com/license PHProjekt 6 License
 * @version    CVS: $Id:
 * @author     Gustavo Solt <solt@mayflower.de>
 * @package    PHProjekt
 * @subpackage Core
 * @link       http://www.phprojekt.com
 * @since      File available since Release 1.0
 */

/**
 * The class provide the functions for manage the relation between
 * the user-tag relation and modules
 *
 * @copyright  2007 Mayflower GmbH (http://www.mayflower.de)
 * @package    PHProjekt
 * @subpackage Core
 * @license    http://phprojekt.com/license PHProjekt 6 License
 * @version    Release: @package_version@
 * @link       http://www.phprojekt.com
 * @since      File available since Release 1.0
 * @author     Gustavo Solt <solt@mayflower.de>
 */
class Phprojekt_Tags_Modules extends Zend_Db_Table_Abstract
{
    /**
     * Table name
     *
     * @var string
     */
    protected $_name = 'TagsModules';

    /**
     * Constructs a Phprojekt_Tags_Modules
     */
    public function __construct()
    {
        $config = array('db' => Zend_Registry::get('db'));
        parent::__construct($config);
    }

    /**
     * Save a new relation User-Tag <-> ModuleId-ItemId
     *
     * Is  nessesary check if exists,
     * since the relations are delete before insert it
     * but can be the same word in the string separated by spaces
     *
     * This function use the Zend_DB insert
     *
     * @param string  $moduleId  The module Id to store
     * @param integer $itemId    The item Id
     * @param integer $tagUserId The User-Tag relation Id
     *
     * @return void
     */
    public function saveTags($moduleId, $itemId, $tagUserId)
    {
        if ($this->find($moduleId, $itemId, $tagUserId)->count() == 0) {
            $data['moduleId']   = $moduleId;
            $data['itemId']     = $itemId;
            $data['tagUserId']  = $tagUserId;
            $this->insert($data);
        }
    }

    /**
     * Return all the modules with the relation User-Tag
     *
     * @param integer $tagUserId Relation User-Tag Id
     * @param integer $projectId Current Project Id
     *
     * @return array
     */
    public function getModulesByRelationId($tagUserId, $projectId)
    {
        $where        = array();
        $foundResults = array();

        $where[] = 'tagUserId  = '. $this->getAdapter()->quote($tagUserId);

        $modules = $this->fetchAll($where);
        foreach ($modules as $moduleData) {
            $foundResults[] = array('itemId'     => $moduleData->itemId,
                                    'moduleId'   => $moduleData->moduleId);
        }

        return $foundResults;
    }

    /**
     * Return all the relations with the pair moduleId-itemId
     *
     * @param string  $moduleId The module Id to store
     * @param integer $itemId   The item Id
     *
     * @return integer
     */
    public function getRelationIdByModule($moduleId, $itemId)
    {
        $where        = array();
        $foundResults = array();

        $where[] = 'moduleId  = '. $this->getAdapter()->quote($moduleId);
        $where[] = 'itemId  = '. $this->getAdapter()->quote($itemId);

        $modules = $this->fetchAll($where);
        foreach ($modules as $moduleData) {
            $foundResults[] = $moduleData->tagUserId;
        }

        return $foundResults;
    }

    /**
     * Delete all the entries for one userId-moduleId-itemId pair
     *
     * @param string  $moduleId   The module Id to store
     * @param integer $itemId     The item Id
     * @param array   $tagUserIds All the relationsId for delete
     *
     * @return void
     */
    public function deleteRelations($moduleId, $itemId, $tagUserIds)
    {
        $clone = clone($this);
        foreach ($tagUserIds as $tagUserId) {
            $where = array();
            $where[] = 'moduleId = '. $clone->getAdapter()->quote($moduleId);
            $where[] = 'itemId = '. $clone->getAdapter()->quote($itemId);
            $where[] = 'tagUserId = '. $clone->getAdapter()->quote($tagUserId);
            $clone->delete($where);
        }
    }
}